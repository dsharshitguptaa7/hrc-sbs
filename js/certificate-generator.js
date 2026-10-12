/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Certificate Generator & Canvas / PDF Engine — Refined Print-Ready Edition
 *
 * Renders high-fidelity, archival-grade Harish-Chandra Day participation certificates
 * in exact A4 landscape format (297mm x 210mm) at high-DPI (2970px x 2100px).
 *
 * Official Palette:
 * - Deep Navy: #0B1F33
 * - Royal Blue: #1E4E79
 * - Antique Gold: #C9A227
 * - Champagne: #E8D7A8
 * - Ivory: #F7F4EC
 * - Warm White: #FFFDF8
 */

const HRC_CERTIFICATE = {
  // A4 Landscape at 254 DPI: 2970 x 2100 px (Exact aspect ratio 1.4142 : 1)
  WIDTH: 2970,
  HEIGHT: 2100,

  // Cache for loaded image assets
  assets: {
    csjmuLogo: null,
    hrcLogo: null,
    iitkLogo: null
  },

  /**
   * Preload an image from URL or return null
   */
  async loadImage(src) {
    if (!src) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('[HRC Certificate] Failed to load image asset:', src);
        resolve(null);
      };
      img.src = src;
    });
  },

  /**
   * Preload official logos
   */
  async preloadLogos(basePath = '') {
    const cleanBase = basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : '';
    const [csjmu, hrc, iitk] = await Promise.all([
      this.loadImage(cleanBase + 'assets/logo/csjmu.png'),
      this.loadImage(cleanBase + 'assets/logo/hrc-logo.png'),
      this.loadImage(cleanBase + 'assets/logo/iitk.png')
    ]);
    this.assets.csjmuLogo = csjmu;
    this.assets.hrcLogo = hrc;
    this.assets.iitkLogo = iitk;
  },

  /**
   * Generate QR Code as a data URL using QRCode library if present or native fallback
   */
  async generateQRCode(text) {
    if (!text) return null;
    if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
      try {
        return await QRCode.toDataURL(text, {
          width: 320,
          margin: 1,
          color: { dark: '#0B1F33', light: '#FFFFFF00' }
        });
      } catch (e) {
        console.warn('[HRC Certificate] QRCode generation failed:', e);
      }
    }
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}&color=11-31-51`;
  },

  /**
   * Helper: Wrap text cleanly into multiple lines based on maximum width
   */
  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    // If text already contains explicit newlines, respect them first
    const paragraphs = String(text).split('\n');
    const allLines = [];

    paragraphs.forEach(p => {
      const words = p.trim().split(/\s+/);
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          allLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) allLines.push(currentLine);
    });

    return allLines;
  },

  /**
   * Render the certificate onto an HTML5 Canvas element
   */
  async renderToCanvas(canvas, certData, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;

    const W = this.WIDTH;
    const H = this.HEIGHT;
    const basePath = options.basePath || '';

    // 1. PRELOAD ASSETS
    if (!this.assets.csjmuLogo) {
      await this.preloadLogos(basePath);
    }

    const sigConfig = certData.signatories || {};
    const depSigImg = sigConfig.deputy_director?.signature_url ? await this.loadImage(sigConfig.deputy_director.signature_url) : null;
    const dirSigImg = sigConfig.director?.signature_url ? await this.loadImage(sigConfig.director.signature_url) : null;
    const hodSigImg = sigConfig.hod_math?.signature_url ? await this.loadImage(sigConfig.hod_math.signature_url) : null;

    const verifyUrl = certData.verification_url || `${window.location.origin}/verify.html?id=${certData.certificate_id}`;
    let qrImg = null;
    try {
      const qrDataUrl = await this.generateQRCode(verifyUrl);
      if (qrDataUrl) {
        qrImg = await this.loadImage(qrDataUrl);
      }
    } catch (e) {
      console.warn('QR code render fallback:', e);
    }

    // 2. BACKGROUND & BASE TONE
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, W, H);

    // Elegant subtle radial warmth (Ivory to Warm White)
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 250, W / 2, H / 2, W / 1.15);
    bgGrad.addColorStop(0, '#FFFDF8');
    bgGrad.addColorStop(0.65, '#FAF6ED');
    bgGrad.addColorStop(1, '#F3ECE0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 3. REFINED BORDER TREATMENT
    // Strong, fine navy outer rule & thinner antique-gold inner rule
    const outerMargin = 70;
    const innerMargin = 92;
    const strokeGold = '#C9A227';
    const strokeNavy = '#0B1F33';

    // Outer Navy Border
    ctx.strokeStyle = strokeNavy;
    ctx.lineWidth = 4;
    ctx.strokeRect(outerMargin, outerMargin, W - (outerMargin * 2), H - (outerMargin * 2));

    // Inner Gold Border
    ctx.strokeStyle = strokeGold;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(innerMargin, innerMargin, W - (innerMargin * 2), H - (innerMargin * 2));

    // Refined clean corner cornerstones
    const cornerSize = 14;
    const corners = [
      [innerMargin, innerMargin],
      [W - innerMargin, innerMargin],
      [innerMargin, H - innerMargin],
      [W - innerMargin, H - innerMargin]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = strokeGold;
      ctx.fillRect(-cornerSize / 2, -cornerSize / 2, cornerSize, cornerSize);
      ctx.strokeStyle = strokeNavy;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-cornerSize, -cornerSize, cornerSize * 2, cornerSize * 2);
      ctx.restore();
    });

    // 4. REFINED WATERMARK (Official HRC Emblem, centred behind content)
    ctx.save();
    ctx.globalAlpha = 0.045; // Subtle, elegant, clearly visible when printed without reducing text contrast
    if (this.assets.hrcLogo) {
      // Preserve HRC emblem aspect ratio (approx 3.589 : 1)
      const wmW = 1100;
      const wmH = wmW * (this.assets.hrcLogo.height / this.assets.hrcLogo.width);
      ctx.drawImage(this.assets.hrcLogo, (W - wmW) / 2, (H - wmH) / 2 - 20, wmW, wmH);
    }
    ctx.restore();

    // 5. INSTITUTIONAL HEADER & LOGOS
    // Preserve exact aspect ratio for all three emblems with matching visual height
    const headerTop = 135;
    const targetEmblemHeight = 115;

    // CSJMU Logo (Left) — Aspect approx 0.914
    if (this.assets.csjmuLogo) {
      const csjmuAspect = this.assets.csjmuLogo.width / this.assets.csjmuLogo.height;
      const csjmuW = targetEmblemHeight * csjmuAspect;
      ctx.drawImage(this.assets.csjmuLogo, 160, headerTop - 5, csjmuW, targetEmblemHeight);
    }

    // HRC Emblem (Center) — Aspect approx 3.589
    if (this.assets.hrcLogo) {
      const hrcAspect = this.assets.hrcLogo.width / this.assets.hrcLogo.height;
      const hrcH = 75;
      const hrcW = hrcH * hrcAspect;
      ctx.drawImage(this.assets.hrcLogo, (W - hrcW) / 2, headerTop - 15, hrcW, hrcH);
    }

    // IIT Kanpur Seal (Right) — Aspect approx 1.05
    if (this.assets.iitkLogo) {
      const iitkAspect = this.assets.iitkLogo.width / this.assets.iitkLogo.height;
      const iitkW = targetEmblemHeight * iitkAspect;
      ctx.drawImage(this.assets.iitkLogo, W - 160 - iitkW, headerTop - 5, iitkW, targetEmblemHeight);
    }

    // Institutional Text Hierarchy
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#1E4E79';
    ctx.font = '600 29px "Inter", sans-serif';
    ctx.letterSpacing = '0.12em';
    ctx.fillText('HARISH-CHANDRA RESEARCH CENTRE', W / 2, headerTop + 95);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 22px "Inter", sans-serif';
    ctx.letterSpacing = '0.06em';
    ctx.fillText('SCHOOL OF BASIC SCIENCES · CHHATRAPATI SHAHU JI MAHARAJ UNIVERSITY, KANPUR', W / 2, headerTop + 135);

    ctx.fillStyle = '#C9A227';
    ctx.font = '600 18px "Inter", sans-serif';
    ctx.letterSpacing = '0.14em';
    ctx.fillText('IN ACTIVE COLLABORATION WITH INDIAN INSTITUTE OF TECHNOLOGY KANPUR', W / 2, headerTop + 170);

    // Decorative Separator Bar
    const sepY = headerTop + 205;
    ctx.strokeStyle = '#E8D7A8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 400, sepY);
    ctx.lineTo(W / 2 + 400, sepY);
    ctx.stroke();

    ctx.fillStyle = '#C9A227';
    ctx.fillRect(W / 2 - 22, sepY - 3, 44, 6);

    // 6. OFFICIAL CERTIFICATE IDENTITY
    // "HARISH-CHANDRA DAY"
    ctx.fillStyle = '#0B1F33';
    ctx.font = '700 46px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '0.18em';
    ctx.fillText('HARISH-CHANDRA DAY', W / 2, sepY + 68);

    // "CERTIFICATE OF PARTICIPATION" (Refined prominence without distortion)
    ctx.fillStyle = '#1E4E79';
    ctx.font = '700 68px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '0.07em';
    ctx.fillText('CERTIFICATE OF PARTICIPATION', W / 2, sepY + 148);

    // Presentation Clause
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 400 30px "Cormorant Garamond", Garamond, serif';
    ctx.letterSpacing = '0.03em';
    ctx.fillText('This certificate is proudly presented to', W / 2, sepY + 230);

    // 7. PARTICIPANT NAME (Central Visual Focus)
    const participantName = certData.participant_name || 'Participant Name';
    ctx.fillStyle = '#0B1F33';
    ctx.font = '700 64px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '0.02em';
    ctx.fillText(participantName, W / 2, sepY + 308);

    // Participant Name Decorative Underline
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 2.2;
    const nameMeasure = ctx.measureText(participantName).width;
    const nameLineWidth = Math.min(Math.max(nameMeasure + 80, 480), 1600);
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameLineWidth / 2, sepY + 350);
    ctx.lineTo(W / 2 + nameLineWidth / 2, sepY + 350);
    ctx.stroke();

    // 8. TEAM & COMPETITION DETAILS (Directly beneath Participant Name)
    let bodyY = sepY + 408;

    if (certData.team_name && certData.team_name.trim() !== '') {
      ctx.fillStyle = '#1E4E79';
      ctx.font = '600 26px "Inter", sans-serif';
      ctx.letterSpacing = '0.04em';
      ctx.fillText(`Team: ${certData.team_name.trim()}`, W / 2, bodyY);
      bodyY += 46;
    }

    // FORMAL PARTICIPATION STATEMENT (Balanced line spacing, no clipping)
    const compName = certData.competition_name || 'Academic Event Track';
    const eventYear = certData.event_year || 2026;

    ctx.fillStyle = '#334155';
    ctx.font = '400 30px "Cormorant Garamond", Garamond, serif';
    ctx.letterSpacing = '0.02em';

    // Line 1: Competition Name (Auto-wrapped if very long to prevent horizontal clipping)
    const compClause = `for participating in "${compName}"`;
    const compLines = this.wrapText(ctx, compClause, 2300);

    compLines.forEach(line => {
      ctx.fillText(line, W / 2, bodyY);
      bodyY += 46;
    });

    // Line 2: Event & Institutional Context
    ctx.fillText(
      `as part of Harish-Chandra Day ${eventYear}, organized by the Harish-Chandra Research Centre,`,
      W / 2,
      bodyY
    );
    bodyY += 46;

    // Line 3: Collaborative Affiliation
    ctx.fillText(
      `School of Basic Sciences, Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur, in collaboration with IIT Kanpur.`,
      W / 2,
      bodyY
    );

    // REVOCATION WATERMARK OVERLAY (If revoked)
    if (certData.status === 'revoked') {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-Math.PI / 8);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.16)';
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
      ctx.lineWidth = 14;
      ctx.font = '900 160px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeRect(-900, -120, 1800, 240);
      ctx.fillText('REVOKED / INVALID', 0, 0);
      ctx.restore();
    }

    // 9. THREE OFFICIAL SIGNATORIES (Evenly Balanced Columns, Generous Spacing)
    // Left-to-Right Hierarchy:
    // Column 1 (Left): Deputy Director — Prof. Anju Dixit
    // Column 2 (Center): Director — Prof. R. K. Dwivedi
    // Column 3 (Right): HOD Mathematics — Dr. P. N. Pathak [Highest authority on the right as specified]
    const sigY = 1620; // Elevated for comfortable breathing room above footer
    const colLeftX = 540;
    const colCenterX = W / 2;
    const colRightX = W - 540;
    const colMaxWidth = 560; // Clean column width to prevent text collision

    const sigDepConfig = sigConfig.deputy_director || {
      name: 'Prof. Anju Dixit',
      designation: 'Deputy Director, School of Basic Sciences, CSJMU'
    };
    const sigDirConfig = sigConfig.director || {
      name: 'Prof. R. K. Dwivedi',
      designation: 'Director, School of Basic Sciences, CSJMU'
    };
    const sigHODConfig = sigConfig.hod_math || {
      name: 'Dr. P. N. Pathak',
      designation: 'Head of Department / Coordinator, Department of Mathematics, School of Basic Sciences, CSJMU'
    };

    // Helper: Draw Single Balanced Signature Column with multi-line designation wrapping
    const drawSignatureColumn = (x, sigImg, name, desigRaw) => {
      // 1. Signature Image or Clean Signature Line
      if (sigImg) {
        const sigH = 85;
        const aspect = sigImg.width / sigImg.height;
        const sigW = Math.min(sigH * aspect, 280);
        ctx.drawImage(sigImg, x - sigW / 2, sigY - 100, sigW, sigH);
      } else {
        // Clean signature line with adequate width
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 170, sigY - 18);
        ctx.lineTo(x + 170, sigY - 18);
        ctx.stroke();
      }

      // 2. Printed Name (Bold serif, highly legible)
      ctx.fillStyle = '#0B1F33';
      ctx.font = '700 27px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, x, sigY + 28);

      // 3. Multi-line Designation Wrapping (Prevents horizontal overflow and collision)
      ctx.font = '500 18.5px "Inter", sans-serif';
      const desigLines = this.wrapText(ctx, desigRaw, colMaxWidth);

      let lineY = sigY + 64;
      desigLines.forEach((line, idx) => {
        // First line is primary title (Royal Blue), following lines are department/institution (Slate)
        ctx.fillStyle = idx === 0 ? '#1E4E79' : '#64748B';
        ctx.fillText(line, x, lineY);
        lineY += 26;
      });
    };

    // Render 1: Deputy Director (Left)
    drawSignatureColumn(
      colLeftX,
      depSigImg,
      sigDepConfig.name || 'Prof. Anju Dixit',
      sigDepConfig.designation || 'Deputy Director, School of Basic Sciences, CSJMU'
    );

    // Render 2: Director (Center)
    drawSignatureColumn(
      colCenterX,
      dirSigImg,
      sigDirConfig.name || 'Prof. R. K. Dwivedi',
      sigDirConfig.designation || 'Director, School of Basic Sciences, CSJMU'
    );

    // Render 3: HOD Mathematics (Right)
    drawSignatureColumn(
      colRightX,
      hodSigImg,
      sigHODConfig.name || 'Dr. P. N. Pathak',
      sigHODConfig.designation || 'Head of Department / Coordinator, Department of Mathematics, School of Basic Sciences, CSJMU'
    );

    // 10. REFINED FOOTER METADATA BAR & VERIFICATION QR CODE
    // Sits comfortably at bottom (inside inner border, no overlap with signatures)
    const footerY = H - 150;

    // Bottom-Left: Certificate ID, Issue Date & Status
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0B1F33';
    ctx.font = '700 23px "Inter", monospace';
    ctx.fillText(`CERTIFICATE ID: ${certData.certificate_id || 'HCD-2026-XXXXXXXX'}`, 140, footerY);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.fillText(`ISSUED: ${certData.issue_date || 'October 11, 2026'} · OFFICIAL VERIFIED RECORD`, 140, footerY + 30);

    // Bottom-Center: Authenticity Seal Statement
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C9A227';
    ctx.font = '600 16px "Inter", sans-serif';
    ctx.letterSpacing = '0.08em';
    ctx.fillText('OFFICIAL PARTICIPATION RECORD · HARISH-CHANDRA RESEARCH CENTRE', W / 2, footerY + 16);

    // Bottom-Right: High-Resolution Verification QR Code with Quiet Space
    if (qrImg) {
      const qrSize = 110;
      const qrX = W - 140 - qrSize;
      const qrY = footerY - 58;

      // Draw white quiet-zone background behind QR code for guaranteed scanner contrast
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // QR Verification Instruction Text (Safely placed to the left of QR)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1E4E79';
      ctx.font = '600 16px "Inter", sans-serif';
      ctx.fillText('Scan to Verify', qrX - 16, footerY - 5);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 14px "Inter", sans-serif';
      ctx.fillText('Official Credential', qrX - 16, footerY + 18);
    }
  },

  /**
   * Export the rendered canvas to a high-resolution, print-ready A4 landscape PDF
   * Uses precise A4 landscape dimensions (297mm x 210mm) and high quality compression.
   */
  async exportToPDF(canvas, fileName = 'Harish-Chandra-Day-Certificate.pdf') {
    if (!canvas) throw new Error('Canvas element required for PDF generation.');

    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      throw new Error('jsPDF library is not loaded. Please ensure jspdf.umd.min.js is included.');
    }

    const { jsPDF } = window.jspdf || window;

    // Exact A4 Landscape Page: 297mm x 210mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // 0.96 quality JPEG stream from 2970x2100 canvas (300 DPI equivalent)
    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'SLOW');
    pdf.save(fileName);
  }
};

window.HRC_CERTIFICATE = HRC_CERTIFICATE;
