// Variabile globale și configurări
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

let currentAngle = 0;
let targetAngle = 0;
let isBeamOn = false;
let showDoseDistribution = false;
let beamEnergy = 6;
let beamWidth = 100;
let fractionNumber = 0;
let totalFractions = 30;
let accumulatedDose = 0;
let currentField = '-';
let isSimulating = false;
let treatmentTechnique = '2D';
let treatmentPaused = false;
let tumorShape = 'round';
let doseDistributionCanvas = null;
let currentDoseCanvas = null;
let beamRelativePosition = 0;

const structures = {
    tumor: { x: 400, y: 300, radius: 30 },
    heart: { x: 370, y: 230, radiusX: 40, radiusY: 50, angle: Math.PI / 4 },
    leftLung: { x: 340, y: 250, radiusX: 70, radiusY: 100 },
    rightLung: { x: 460, y: 250, radiusX: 70, radiusY: 100 },
    spine: { x: 400, y: 300, width: 30, height: 300 },
    body: { x: 400, y: 300, radiusX: 150, radiusY: 200 }
};

const treatmentTechniques = {
    '2D': {
        fields: [0, 180],
        beamShape: 'rectangular',
        margin: 20,
        precision: 20,
        tissueProtection: 30,
        treatmentTime: () => 15 + Math.random() * 5,
        mlc: null,
        fractions: 30
    },
    '3D': {
        fields: [0, 72, 144, 216, 288],
        beamShape: 'conformal',
        margin: 10,
        precision: 40,
        tissueProtection: 50,
        treatmentTime: () => 15 + Math.random() * 5,
        mlc: { type: 'Standard', leafWidth: 10 },
        fractions: 30
    },
    'IMRT': {
        fields: [0, 40, 80, 120, 160, 200, 240, 280, 320],
        beamShape: 'modulated',
        margin: 5,
        precision: 70,
        tissueProtection: 80,
        treatmentTime: () => 20 + Math.random() * 10,
        mlc: { type: 'Standard sau HD', leafWidth: '5-10' },
        fractions: 30
    },
    'VMAT': {
        fields: Array.from({length: 360}, (_, i) => i),
        beamShape: 'modulated',
        margin: 3,
        precision: 85,
        tissueProtection: 90,
        treatmentTime: () => 10 + Math.random() * 5,
        mlc: { type: 'HD sau Micro', leafWidth: '2.5-5' },
        fractions: 30
    },
    'SRS': {
        fields: Array.from({length: 36}, (_, i) => i * 10),
        beamShape: 'convergent',
        margin: 1,
        precision: 95,
        tissueProtection: 95,
        treatmentTime: () => 30 + Math.random() * 30,
        mlc: { type: 'Micro', leafWidth: 2.5 },
        fractions: 1
    },
    'SBRT': {
        fields: Array.from({length: 36}, (_, i) => i * 10),
        beamShape: 'convergent',
        margin: 2,
        precision: 95,
        tissueProtection: 95,
        treatmentTime: () => 30 + Math.random() * 30,
        mlc: { type: 'HD sau Micro', leafWidth: '2.5-5' },
        fractions: 5
    }
};

const clinicalTechnicalData = {
    '2D': {
        clinical: {
            "Aplicații comune și tumori": "Cancer de sân (post-mastectomie), iradiere paliativă (metastaze osoase, compresie medulară)",
            "Dimensiuni tumori": "Variabile, adesea pentru câmpuri extinse",
            "Avantaje": "Simplitate, timp scurt de planificare și tratament, util în setări cu resurse limitate",
            "Dezavantaje": "Precizie limitată, doză mare la țesuturile sănătoase, limitări în escaladarea dozei",
            "Doză tipică": "Paliativ: 8-30 Gy în 1-10 fracții; Curativ: 50-60 Gy în 25-30 fracții"
        },
        technical: {
            "Imagistică planificare": "Radiografii 2D, simulare convențională",
            "Margini planificare": "1-2 cm",
            "Rata dozei": "200-300 MU/min"
        }
    },
    '3D': {
        clinical: {
            "Aplicații comune și tumori": "Cancer pulmonar, cancer de prostată, tumori cerebrale, cancere ORL, cancer de sân",
            "Dimensiuni tumori": "Eficient pentru tumori de diverse dimensiuni, tipic 2-10 cm",
            "Avantaje": "Conformare mai bună la forma tumorii, reducerea dozei la organe critice, permite escaladarea dozei",
            "Dezavantaje": "Timp mai lung de planificare față de 2D, necesită CT pentru planificare",
            "Doză tipică": "60-74 Gy în 30-37 fracții (depinde de localizare și intenție)"
        },
        technical: {
            "Imagistică planificare": "CT, posibil fuziune cu IRM sau PET-CT",
            "Margini planificare": "0.7-1.5 cm, în funcție de localizare și tehnici de imobilizare",
            "Rata dozei": "300-600 MU/min"
        }
    },
    'IMRT': {
        clinical: {
            "Aplicații comune și tumori": "Cancer de prostată, cancere ORL, tumori cerebrale, cancer pulmonar, cancer pancreatic",
            "Dimensiuni tumori": "Eficient pentru tumori complexe, neregulate, de 1-15 cm",
            "Avantaje": "Distribuție de doză foarte conformală, protecție superioară a organelor critice, permite boost integrat",
            "Dezavantaje": "Timp lung de planificare și tratament, doză integrală mai mare, necesită QA complex",
            "Doză tipică": "ORL: 60-70 Gy (2-2.2 Gy/fracție); Prostată: 74-80 Gy (1.8-2 Gy/fracție)"
        },
        technical: {
            "Imagistică planificare": "CT, fuziune cu IRM și/sau PET-CT",
            "Margini planificare": "0.3-0.7 cm, depinde de localizare și tehnici de IGRT",
            "Rata dozei": "400-600 MU/min",
            "Constrângeri organe la risc": "Specific fiecărui organ, ex: plămân V20 < 30%, cord V25 < 10%"
        }
    },
    'VMAT': {
        clinical: {
            "Aplicații comune și tumori": "Similar cu IMRT, plus metastaze multiple, iradieri pelvine extinse",
            "Dimensiuni tumori": "Eficient pentru tumori de 1-15 cm, inclusiv ținte multiple",
            "Avantaje": "Timp de tratament redus față de IMRT, distribuție de doză foarte conformală, eficient pentru ținte multiple",
            "Dezavantaje": "Planificare complexă, necesită QA riguros, posibil doză integrală mai mare decât IMRT",
            "Doză tipică": "Similar cu IMRT: 60-80 Gy în 30-40 fracții (depinde de localizare)"
        },
        technical: {
            "Imagistică planificare": "CT, fuziune cu IRM și/sau PET-CT",
            "Margini planificare": "0.3-0.5 cm cu IGRT zilnic",
            "Rata dozei": "Variabilă, până la 1400 MU/min (depinde de echipament)",
            "Rotație doză arc": "Tipic 1-2 arcuri de 360°, posibil arcuri parțiale"
        }
    },
    'SRS': {
        clinical: {
            "Aplicații comune și tumori": "Metastaze cerebrale, schwannoame vestibulare, meningioame, MAV-uri",
            "Dimensiuni tumori": "Optim pentru leziuni ≤ 3 cm, până la 4 cm în cazuri selectate",
            "Avantaje": "Doză foarte mare într-o fracție unică sau puține fracții, gradient de doză abrupt",
            "Dezavantaje": "Limitat la leziuni mici, necesită imobilizare riguroasă și IGRT de înaltă precizie",
            "Doză tipică": "Metastaze cerebrale: 15-24 Gy în fracție unică; 24-30 Gy în 3-5 fracții pentru leziuni mai mari"
        },
        technical: {
            "Imagistică planificare": "CT și IRM în secvențe subțiri (≤ 1 mm)",
            "Margini planificare": "0-2 mm",
            "Rata dozei": "> 1000 MU/min (FFF - Flattening Filter Free)",
            "Gradient doză": "50% scădere la 2-3 mm de la marginea PTV"
        }
    },
    'SBRT': {
        clinical: {
            "Aplicații comune și tumori": "Cancer pulmonar precoce, metastaze hepatice, tumori spinale, cancer de prostată (boost sau monoterapie)",
            "Dimensiuni tumori": "Optim pentru tumori < 5 cm, până la 7 cm în cazuri selectate",
            "Avantaje": "Doze ablative în puține fracții, timp scurt de tratament, potențial pentru răspuns imun amplificat",
            "Dezavantaje": "Necesită imobilizare precisă și IGRT avansat, risc de toxicitate tardivă",
            "Doză tipică": "Pulmon periferic: 48-54 Gy în 3-5 fracții; Ficat: 30-60 Gy în 3-6 fracții; Prostată: 35-36.25 Gy în 5 fracții"
        },
        technical: {
            "Imagistică planificare": "CT 4D pentru leziuni mobile, fuziune cu IRM/PET-CT",
            "Margini planificare": "0.3-0.5 cm, depinde de localizare și managementul mișcării",
            "Rata dozei": "> 1000 MU/min (FFF)",
            "Managementul mișcării": "Gating respirator, tracking în timp real, compresie abdominală, ITV (Internal Target Volume)"
        }
    }
};

// Funcții de desenare
function drawAnatomy() {
    if (treatmentTechnique === 'SRS') {
        drawSRSAnatomy();
    } else if (treatmentTechnique === 'SBRT') {
        drawSBRTAnatomy();
    } else {
        drawStandardAnatomy();
    }

    const tumorPosition = getTumorPosition();
    ctx.beginPath();
    ctx.arc(tumorPosition.x, tumorPosition.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

function drawStandardAnatomy() {
    ctx.fillStyle = '#f4d3a3';
    ctx.beginPath();
    ctx.ellipse(structures.body.x, structures.body.y, structures.body.radiusX, structures.body.radiusY, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(structures.spine.x - structures.spine.width / 2, structures.spine.y - structures.spine.height / 2, 
                 structures.spine.width, structures.spine.height);

    ctx.fillStyle = '#ffc0cb';
    ctx.beginPath();
    ctx.ellipse(structures.leftLung.x, structures.leftLung.y, structures.leftLung.radiusX, structures.leftLung.radiusY, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(structures.rightLung.x, structures.rightLung.y, structures.rightLung.radiusX, structures.rightLung.radiusY, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ff6347';
    ctx.beginPath();
    ctx.ellipse(structures.heart.x, structures.heart.y, structures.heart.radiusX, structures.heart.radiusY, structures.heart.angle, 0, 2 * Math.PI);
    ctx.fill();

    drawTumor(structures.tumor.x, structures.tumor.y);
}

function drawSRSAnatomy() {
    const centerX = 400;
    const centerY = 260;

    ctx.fillStyle = '#f4d3a3';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 120, 160, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 20, 100, 120, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 140);
    ctx.lineTo(centerX, centerY + 100);
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 80, 50, 25, 0, Math.PI, false);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY + 100);
    ctx.lineTo(centerX - 10, centerY + 140);
    ctx.lineTo(centerX + 10, centerY + 140);
    ctx.lineTo(centerX + 10, centerY + 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY - 20, 60 + i * 8, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY - 20, 60 + i * 8, 1.1 * Math.PI, 1.9 * Math.PI);
        ctx.stroke();
    }

    drawTumor(centerX, centerY - 20, structures.tumor.radius * 0.3);
}

function drawSBRTAnatomy() {
    const centerX = 400;
    const centerY = 300;

    ctx.fillStyle = '#f4d3a3';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 180, 220, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#d3d3d3';
    ctx.beginPath();
    ctx.rect(centerX - 10, centerY - 180, 20, 360);
    ctx.fill();
    ctx.strokeStyle = '#a9a9a9';
    ctx.stroke();

    ctx.strokeStyle = '#a9a9a9';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 140 + i * 25);
        ctx.quadraticCurveTo(centerX + 80, centerY - 130 + i * 25, centerX + 160, centerY - 120 + i * 25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 140 + i * 25);
        ctx.quadraticCurveTo(centerX - 80, centerY - 130 + i * 25, centerX - 160, centerY - 120 + i * 25);
        ctx.stroke();
    }

    ctx.fillStyle = '#ffc0cb';
    ctx.beginPath();
    ctx.ellipse(centerX - 60, centerY - 50, 70, 100, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(centerX + 60, centerY - 50, 70, 100, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff6347';
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY - 80);
    ctx.quadraticCurveTo(centerX, centerY - 120, centerX + 40, centerY - 80);
    ctx.quadraticCurveTo(centerX + 50, centerY - 50, centerX + 40, centerY - 20);
    ctx.quadraticCurveTo(centerX, centerY, centerX - 40, centerY - 20);
    ctx.quadraticCurveTo(centerX - 50, centerY - 50, centerX - 40, centerY - 80);
    ctx.fill();
    ctx.stroke();

    drawTumor(centerX - 50, centerY - 50, structures.tumor.radius * 0.3);
}

function drawTumor(x, y, radius = structures.tumor.radius) {
    const tumorPosition = getTumorPosition();
    ctx.fillStyle = '#ff4136';
    ctx.strokeStyle = '#85144b';
    ctx.lineWidth = 2;
    
    if (tumorShape === 'round') {
        ctx.beginPath();
        ctx.arc(tumorPosition.x, tumorPosition.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    } else {
        drawIrregularTumor(tumorPosition.x, tumorPosition.y, radius);
    }
}

function drawIrregularTumor(x, y, radius) {
    ctx.beginPath();
    
    const angle = 2 * Math.PI / 3;
    const cornerRadius = radius * 0.3;
    
    for (let i = 0; i < 3; i++) {
        const currentAngle = i * angle - Math.PI / 2;
        const nextAngle = (i + 1) * angle - Math.PI / 2;
        
        const point1x = x + (radius - cornerRadius) * Math.cos(currentAngle);
        const point1y = y + (radius - cornerRadius) * Math.sin(currentAngle);
        
        const point2x = x + (radius - cornerRadius) * Math.cos(nextAngle);
        const point2y = y + (radius - cornerRadius) * Math.sin(nextAngle);
        
        ctx.lineTo(point1x, point1y);
        
        ctx.arcTo(
            x + radius * Math.cos(currentAngle + angle / 2),
            y + radius * Math.sin(currentAngle + angle / 2),
            point2x,
            point2y,
            cornerRadius
        );
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function getTumorPosition() {
    switch (treatmentTechnique) {
        case 'SRS':
            return { x: 400, y: 260 };
        case 'SBRT':
            return { x: 350, y: 250 };
        default:
            return { x: 400, y: 300 };
    }
}

function drawBeam(angle) {
    if (!isBeamOn) return;

    const techParams = treatmentTechniques[treatmentTechnique];
    const tumorPosition = getTumorPosition();
    const gantryRadius = 280;
    const beamOrigin = calculateBeamOrigin(angle, gantryRadius);

    ctx.save();
    ctx.translate(tumorPosition.x, tumorPosition.y);
    ctx.rotate(angle * Math.PI / 180);

    const dx = beamOrigin.x - tumorPosition.x;
    const dy = beamOrigin.y - tumorPosition.y;
    const distanceToIsocenter = Math.sqrt(dx * dx + dy * dy);

    let beamWidthPx = beamWidth * 0.5;
    
    // Modificăm calculul lungimii fasciculului
    let beamLength = distanceToIsocenter * (1 + beamRelativePosition);
    
    // Limităm lungimea fasciculului pentru a nu depăși gantry-ul în direcția opusă
    beamLength = Math.min(beamLength, distanceToIsocenter * 2);

    console.log(`Energie: ${beamEnergy}, beamRelativePosition: ${beamRelativePosition}, beamLength: ${beamLength}`);

    // Desenăm fasciculul folosind beamLength
    switch (treatmentTechnique) {
        case '2D':
            drawRectangularBeam(0, -distanceToIsocenter, beamWidthPx, beamLength, techParams.precision);
            break;
        case '3D':
            drawConformalBeam(0, -distanceToIsocenter, beamWidthPx, beamLength, techParams.precision);
            break;
        case 'IMRT':
        case 'VMAT':
            drawIMRTBeam(0, -distanceToIsocenter, beamWidthPx, beamLength, techParams.precision);
            break;
        case 'SRS':
        case 'SBRT':
            drawSRSBeam(0, -distanceToIsocenter, beamWidthPx, beamLength, techParams.precision);
            break;
    }

    ctx.restore();
}

function calculateBeamOrigin(gantryAngle, gantryRadius) {
    const tumorPosition = getTumorPosition();
    const angleRad = gantryAngle * Math.PI / 180;
    return {
        x: tumorPosition.x + gantryRadius * Math.sin(angleRad),
        y: tumorPosition.y - gantryRadius * Math.cos(angleRad)
    };
}

function drawRectangularBeam(originX, originY, width, length, precision) {
    const imprecision = (100 - precision) / 100;
    const edgeVariation = width * imprecision * 0.5;

    ctx.beginPath();
    ctx.moveTo(originX - width - edgeVariation, originY);
    ctx.lineTo(originX + width + edgeVariation, originY);
    ctx.lineTo(originX + width - edgeVariation, originY + length);
    ctx.lineTo(originX - width + edgeVariation, originY + length);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(originX, originY, originX, originY + length);
    gradient.addColorStop(0, getYellowShade(beamEnergy / 15));
    gradient.addColorStop(1, getYellowShade(0.05));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();
}

function drawConformalBeam(originX, originY, width, length, precision) {
    const imprecision = (100 - precision) / 100;
    const edgeVariation = width * imprecision * 0.5;

    ctx.beginPath();
    ctx.moveTo(originX - width - edgeVariation, originY);
    ctx.lineTo(originX + width + edgeVariation, originY);
    ctx.quadraticCurveTo(originX + width / 2, originY + length / 2, originX + width - edgeVariation, originY + length);
    ctx.lineTo(originX - width + edgeVariation, originY + length);
    ctx.quadraticCurveTo(originX - width / 2, originY + length / 2, originX - width - edgeVariation, originY);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(originX, originY, originX, originY + length);
    gradient.addColorStop(0, getYellowShade(beamEnergy / 15, 10));
    gradient.addColorStop(1, getYellowShade(0.05, 10));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();
}

function drawIMRTBeam(originX, originY, width, length, precision) {
    const segments = 7;
    const segmentLength = length / segments;

    for (let i = 0; i < segments; i++) {
        const segmentWidth = width * (0.5 + Math.random() * 0.5);
        const intensity = Math.random() * 0.7 + 0.3;
        
        const gradient = ctx.createLinearGradient(originX, originY + i * segmentLength, originX, originY + (i + 1) * segmentLength);
        gradient.addColorStop(0, getYellowShade(intensity * beamEnergy / 15, 20));
        gradient.addColorStop(1, getYellowShade(intensity * 0.05, 20));
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.rect(originX - segmentWidth / 2, originY + i * segmentLength, segmentWidth, segmentLength);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
    }
}

function drawSRSBeam(originX, originY, width, length, precision) {
    const maxWidth = width * 0.2;
    const tumorRadius = getTumorRadius();

    ctx.beginPath();
    ctx.moveTo(originX - maxWidth, originY);
    ctx.lineTo(originX + maxWidth, originY);
    ctx.lineTo(originX + tumorRadius, originY + length);
    ctx.lineTo(originX - tumorRadius, originY + length);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(originX, originY, originX, originY + length);
    gradient.addColorStop(0, getYellowShade(beamEnergy / 15, -10));
    gradient.addColorStop(1, getYellowShade(0.9, -10));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -5; i <= 5; i++) {
        const leafPosition = i * (maxWidth / 5);
        ctx.moveTo(originX + leafPosition, originY);
        ctx.lineTo(originX + (leafPosition / maxWidth) * tumorRadius, originY + length);
    }
    ctx.stroke();
}

function getYellowShade(intensity, hueShift = 0) {
    const hue = (60 + hueShift) % 360;
    return `hsla(${hue}, 100%, 50%, ${intensity})`;
}

function getTumorRadius() {
    const baseRadius = structures.tumor.radius;
    switch (treatmentTechnique) {
        case 'SRS':
        case 'SBRT':
            return baseRadius * 0.3;
        default:
            return baseRadius;
    }
}

function drawGantry(angle) {
    const tumorPosition = getTumorPosition();
    ctx.save();
    ctx.translate(tumorPosition.x, tumorPosition.y);
    ctx.rotate(angle * Math.PI / 180);

    ctx.fillStyle = '#808080';
    ctx.fillRect(-50, -320, 100, 70);

    const techParams = treatmentTechniques[treatmentTechnique];
    if (techParams.mlc) {
        drawMLC(techParams.mlc);
    }

    ctx.fillStyle = isBeamOn ? '#00ff00' : '#ff0000';
    ctx.beginPath();
    ctx.arc(0, -280, 10, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
}

function drawMLC(mlcParams) {
    const gantryRadius = 280;
    const mlcWidth = gantryRadius * 0.6;
    const mlcHeight = gantryRadius * 0.15;

    ctx.fillStyle = '#606060';
    ctx.fillRect(-mlcWidth / 2, -gantryRadius - mlcHeight, mlcWidth, mlcHeight);

    ctx.fillStyle = '#404040';
    const leafWidth = parseFloat(mlcParams.leafWidth);
    const leafCount = Math.floor(mlcWidth / leafWidth);
    
    for (let i = 0; i < leafCount; i++) {
        const x = -mlcWidth / 2 + i * leafWidth;
        const randomExtension = Math.random() * (mlcHeight / 2);
        
        ctx.fillRect(x, -gantryRadius - mlcHeight, leafWidth, mlcHeight / 2 + randomExtension);
        ctx.fillRect(x, -gantryRadius - mlcHeight / 2 - randomExtension, leafWidth, mlcHeight / 2 + randomExtension);
    }
}

function updateDoseDistribution() {
    if (!doseDistributionCanvas) {
        doseDistributionCanvas = createDoseDistributionImage();
    }
    if (!currentDoseCanvas) {
        currentDoseCanvas = document.createElement('canvas');
        currentDoseCanvas.width = 800;
        currentDoseCanvas.height = 600;
    }
    const tempCtx = currentDoseCanvas.getContext('2d');
    tempCtx.clearRect(0, 0, 800, 600);
    tempCtx.globalAlpha = accumulatedDose / 100;
    tempCtx.drawImage(doseDistributionCanvas, 0, 0);
}

function createDoseDistributionImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    const tumorPosition = getTumorPosition();
    const tumorRadius = getTumorRadius();
    const maxRadius = tumorRadius * 4;

    for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
            const dx = x - tumorPosition.x;
            const dy = y - tumorPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= maxRadius) {
                let dose = calculateDose(x, y, distance, treatmentTechnique, tumorRadius);
                ctx.fillStyle = getColorForDose(dose);
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    drawIsodoseLines(ctx, tumorPosition, tumorRadius, maxRadius);

    return canvas;
}

function drawIsodoseLines(ctx, tumorPosition, tumorRadius, maxRadius) {
    const isodoseLines = [0.9, 0.7, 0.5, 0.3];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    
    isodoseLines.forEach(isodose => {
        ctx.beginPath();
        for (let angle = 0; angle < 2 * Math.PI; angle += 0.1) {
            let r = 0;
            for (r = 0; r <= maxRadius; r++) {
                const x = tumorPosition.x + r * Math.cos(angle);
                const y = tumorPosition.y + r * Math.sin(angle);
                const dose = calculateDose(x, y, r, treatmentTechnique, tumorRadius);
                if (dose <= isodose) break;
            }
            ctx.lineTo(tumorPosition.x + r * Math.cos(angle), tumorPosition.y + r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
    });
}

function calculateDose(x, y, distance, technique, tumorRadius) {
    const tumorPosition = getTumorPosition();
    const maxRadius = tumorRadius * 4;
    const techParams = treatmentTechniques[technique];

    let doseFalloff;
    let gradientFactor;

    switch (technique) {
        case '2D':
            doseFalloff = Math.pow(1 - distance / maxRadius, 1.2);
            gradientFactor = 1;
            break;
        case '3D':
            doseFalloff = Math.pow(1 - distance / maxRadius, 1.5);
            gradientFactor = 1.2;
            break;
        case 'IMRT':
        case 'VMAT':
            doseFalloff = Math.pow(1 - distance / maxRadius, 2);
            gradientFactor = 1.5;
            break;
        case 'SRS':
        case 'SBRT':
            const falloff = distance < tumorRadius ? 0 : (distance - tumorRadius) / (maxRadius - tumorRadius);
            doseFalloff = Math.pow(1 - falloff, 4);
            gradientFactor = 2;
            break;
        default:
            doseFalloff = Math.pow(1 - distance / maxRadius, 2);
            gradientFactor = 1;
    }

    const effectiveRadius = tumorRadius + techParams.margin;
    const inTarget = distance <= effectiveRadius ? 1 : 0;

    return Math.min(1, (doseFalloff + inTarget * 0.5) * gradientFactor);
}

function getColorForDose(dose) {
    const colorStops = [
        { value: 0.1, color: [0, 0, 255] },
        { value: 0.3, color: [0, 255, 255] },
        { value: 0.5, color: [0, 255, 0] },
        { value: 0.7, color: [255, 255, 0] },
        { value: 0.9, color: [255, 128, 0] },
        { value: 1.0, color: [255, 0, 0] }
    ];

    for (let i = 1; i < colorStops.length; i++) {
        if (dose <= colorStops[i].value) {
            const t = (dose - colorStops[i-1].value) / (colorStops[i].value - colorStops[i-1].value);
            const r = Math.round(colorStops[i-1].color[0] + t * (colorStops[i].color[0] - colorStops[i-1].color[0]));
            const g = Math.round(colorStops[i-1].color[1] + t * (colorStops[i].color[1] - colorStops[i-1].color[1]));
            const b = Math.round(colorStops[i-1].color[2] + t * (colorStops[i].color[2] - colorStops[i-1].color[2]));
            return `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
    }
    return `rgba(255, 0, 0, 0.7)`;
}

function drawDoseDistribution() {
    if (!showDoseDistribution) return;
    if (!currentDoseCanvas) {
        updateDoseDistribution();
    }
    ctx.drawImage(currentDoseCanvas, 0, 0);
}

function scaleScene() {
    const sceneWidth = 800;
    const sceneHeight = 600;
    
    const scaleX = canvas.width / sceneWidth;
    const scaleY = canvas.height / sceneHeight;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = sceneWidth * scale;
    const scaledHeight = sceneHeight * scale;

    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    drawAnatomy();
    if (showDoseDistribution) {
        drawDoseDistribution();
    }
    drawGantry(currentAngle);
    if (isBeamOn) {
        drawBeam(currentAngle);
    }

    ctx.restore();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    scaleScene();
    updateInfo();
    requestAnimationFrame(animate);
}

function toggleTreatment() {
    if (!isSimulating) {
        startTreatment();
    } else if (treatmentPaused) {
        resumeTreatment();
    } else {
        pauseTreatment();
    }
}

function startTreatment() {
    isSimulating = true;
    treatmentPaused = false;
    accumulatedDose = 0;
    fractionNumber = 1;
    currentDoseCanvas = null;
    doseDistributionCanvas = null;
    updateUIState();
    runTreatmentCycle();
}

function pauseTreatment() {
    treatmentPaused = true;
    updateUIState();
}

function resumeTreatment() {
    treatmentPaused = false;
    updateUIState();
    runTreatmentCycle();
}

function runTreatmentCycle() {
    const techParams = treatmentTechniques[treatmentTechnique];
    let fieldIndex = 0;

    function nextField() {
        if (treatmentPaused) return;

        if (treatmentTechnique === 'VMAT') {
            isBeamOn = true;
            const rotationInterval = setInterval(() => {
                if (treatmentPaused) {
                    clearInterval(rotationInterval);
                    isBeamOn = false;
                    return;
                }

                currentAngle = (currentAngle + 1) % 360;
                
                if (currentAngle === 0) {
                    clearInterval(rotationInterval);
                    isBeamOn = false;
                    fractionNumber++;
                    if (fractionNumber <= techParams.fractions) {
                        setTimeout(runTreatmentCycle, 1000);
                    } else {
                        isSimulating = false;
                        updateUIState();
                    }
                }
            }, 16);
        } else if (fieldIndex < techParams.fields.length) {
            targetAngle = techParams.fields[fieldIndex];
            currentField = getFieldName(targetAngle);
            
            const rotationInterval = setInterval(() => {
                if (treatmentPaused) {
                    clearInterval(rotationInterval);
                    return;
                }

                const angleDiff = (targetAngle - currentAngle + 360) % 360;
                if (angleDiff > 180) {
                    currentAngle = (currentAngle - 1 + 360) % 360;
                } else if (angleDiff > 0) {
                    currentAngle = (currentAngle + 1) % 360;
                } else {
                    clearInterval(rotationInterval);
                    isBeamOn = true;
                    setTimeout(() => {
                        if (treatmentPaused) return;
                        isBeamOn = false;
                        fieldIndex++;
                        nextField();
                    }, 2000);
                }
            }, 16);
        } else {
            fractionNumber++;
            if (fractionNumber <= techParams.fractions) {
                setTimeout(runTreatmentCycle, 1000);
            } else {
                isSimulating = false;
                updateUIState();
            }
        }
    }

    nextField();
}

function getFieldName(angle) {
    switch (angle) {
        case 0: return 'Anterior';
        case 90: return 'Lateral Drept';
        case 180: return 'Posterior';
        case 270: return 'Lateral Stâng';
        default: return `${angle}°`;
    }
}

function updateUIState() {
    const treatmentControlButton = document.getElementById('treatmentControl');
    treatmentControlButton.textContent = isSimulating
        ? (treatmentPaused ? 'Continuă Tratament' : 'Pauză Tratament')
        : 'Start Tratament';
    treatmentControlButton.classList.toggle('active', isSimulating && !treatmentPaused);

    const beamStatusElement = document.getElementById('beamStatus');
    beamStatusElement.textContent = isBeamOn ? 'Activ' : 'Inactiv';
    beamStatusElement.classList.toggle('active', isBeamOn);

    updateMLCControlButton();
}

function animateInfoChange(elementId) {
    const element = document.getElementById(elementId);
    element.classList.add('highlight');
    setTimeout(() => {
        element.classList.remove('highlight');
    }, 300);
}

function updateInfo() {
    const techParams = treatmentTechniques[treatmentTechnique];
    const fieldsPerFraction = techParams.fields.length;
    const dosePerField = 100 / (techParams.fractions * fieldsPerFraction);
    if (isBeamOn) {
        accumulatedDose += dosePerField / 60;
        updateDoseDistribution();
    }

    const updatedElements = [
        { id: 'gantryAngle', value: `${Math.round(currentAngle)}°` },
        { id: 'currentField', value: currentField },
        { id: 'accumulatedDose', value: `${accumulatedDose.toFixed(1)}%` },
        { id: 'fractionNumber', value: `${fractionNumber}/${techParams.fractions}` },
        { id: 'beamStatus', value: isBeamOn ? 'Activ' : 'Inactiv' },
        { id: 'treatmentTechniqueInfo', value: treatmentTechnique }
    ];

    updatedElements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element.textContent !== value) {
            element.textContent = value;
            animateInfoChange(id);
        }
    });

    updateUIState();
}

function updateTechniqueInfo() {
    const techParams = treatmentTechniques[treatmentTechnique];
    const precisionBar = document.getElementById('precisionBar');
    const tissueProtectionBar = document.getElementById('tissueProtectionBar');
    const treatmentTimeSpan = document.getElementById('treatmentTime');
    const marginSpan = document.getElementById('marginValue');
    const fractionsSpan = document.getElementById('fractionsValue');

    precisionBar.innerHTML = `<div class="progress" style="width: ${techParams.precision}%"></div>`;
    tissueProtectionBar.innerHTML = `<div class="progress" style="width: ${techParams.tissueProtection}%"></div>`;
    treatmentTimeSpan.textContent = `${techParams.treatmentTime().toFixed(1)} minute`;
    marginSpan.textContent = `${techParams.margin} mm`;
    fractionsSpan.textContent = `${techParams.fractions}`;

    totalFractions = techParams.fractions;
    fractionNumber = 1;

    updateInfo();
}

function updateTumorShape() {
    drawAnatomy();
}

function updateMLCControlButton() {
    const mlcButton = document.getElementById('mlcControl');
    const techParams = treatmentTechniques[treatmentTechnique];
    
    mlcButton.disabled = false;
    mlcButton.textContent = 'Informații MLC';
    mlcButton.addEventListener('click', toggleMLCInfo);
}

function toggleMLCInfo() {
    const panel = document.getElementById('mlcAdjustmentPanel');
    const techParams = treatmentTechniques[treatmentTechnique];
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        let content = '';
        if (techParams.mlc) {
            content = `
                <h3>Informații MLC pentru ${treatmentTechnique}</h3>
                <p>Tip MLC: ${techParams.mlc.type}</p>
                <p>Lățime lamele: ${techParams.mlc.leafWidth} mm</p>
            `;
        } else {
            content = `
                <h3>Informații MLC pentru ${treatmentTechnique}</h3>
                <p>Această tehnică nu utilizează MLC.</p>
            `;
        }
        panel.innerHTML = content;
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function updateClinicalTechnicalData(technique) {
    const data = clinicalTechnicalData[technique];
    
    let clinicalContent = '<h3>Date Clinice</h3>';
    for (const [key, value] of Object.entries(data.clinical)) {
        clinicalContent += `<p><strong>${key}:</strong> ${value}</p>`;
    }
    document.getElementById('clinicalDataContent').innerHTML = clinicalContent;

    let technicalContent = '<h3>Date Tehnice</h3>';
    for (const [key, value] of Object.entries(data.technical)) {
        technicalContent += `<p><strong>${key}:</strong> ${value}</p>`;
    }
    document.getElementById('technicalDataContent').innerHTML = technicalContent;
}

function toggleInfo(header) {
    header.classList.toggle('active');
    var content = header.nextElementSibling;
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        content.classList.remove('active');
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        content.classList.add('active');
    }
}

function updateBeamRelativePosition() {
    const minEnergy = 1;
    const maxEnergy = 15;
    
    // Ajustăm scala pentru a permite o variație mai mare
    // Acum, -0.5 va reprezenta fasciculul cel mai scurt, 0 va fi la izocentru, și 0.5 va fi cel mai lung
    beamRelativePosition = (beamEnergy - minEnergy) / (maxEnergy - minEnergy) - 0.5;

    console.log(`Energie actualizată: ${beamEnergy}, beamRelativePosition: ${beamRelativePosition}`);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const treatmentControlButton = document.getElementById('treatmentControl');
    if (treatmentControlButton) {
        treatmentControlButton.addEventListener('click', toggleTreatment);
    }

    const showDoseCheckbox = document.getElementById('showDoseDistribution');
    if (showDoseCheckbox) {
        showDoseCheckbox.addEventListener('change', function() {
            showDoseDistribution = this.checked;
        });
    }

    const beamEnergySlider = document.getElementById('beamEnergy');
    if (beamEnergySlider) {
        beamEnergySlider.addEventListener('input', function() {
            beamEnergy = parseInt(this.value);
            document.getElementById('beamEnergyValue').textContent = `${beamEnergy} MeV`;
            updateBeamRelativePosition();
        });
    }

    const beamWidthSlider = document.getElementById('beamWidth');
    if (beamWidthSlider) {
        beamWidthSlider.addEventListener('input', function() {
            beamWidth = parseInt(this.value);
            document.getElementById('beamWidthValue').textContent = `${beamWidth} mm`;
        });
    }

    const techniqueSelector = document.getElementById('treatmentTechnique');
    if (techniqueSelector) {
        techniqueSelector.addEventListener('change', function() {
            treatmentTechnique = this.value;
            updateTechniqueInfo();
            updateClinicalTechnicalData(treatmentTechnique);
            doseDistributionCanvas = null;
            drawAnatomy();
        });
    }

    const tumorShapeSelector = document.getElementById('tumorShape');
    if (tumorShapeSelector) {
        tumorShapeSelector.addEventListener('change', function() {
            tumorShape = this.value;
            updateTumorShape();
        });
    }

    const infoHeaders = document.querySelectorAll('.info-header');
    infoHeaders.forEach(header => {
        header.addEventListener('click', function() {
            toggleInfo(this);
        });
    });

    updateTechniqueInfo();
    updateInfo();
    updateMLCControlButton();
    updateClinicalTechnicalData(treatmentTechnique);
    updateBeamRelativePosition();
});

// Funcție pentru a rezeta simularea
function resetSimulation() {
    isSimulating = false;
    treatmentPaused = false;
    isBeamOn = false;
    currentAngle = 0;
    accumulatedDose = 0;
    fractionNumber = 0;
    currentField = '-';
    currentDoseCanvas = null;
    doseDistributionCanvas = null;

    updateUIState();
    updateInfo();
    drawAnatomy();
}

// Inițializarea animației
animate();

// Adăugarea unor taste rapide pentru controlul simulării
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case ' ':
            toggleTreatment();
            break;
        case 'r':
            resetSimulation();
            break;
        case 'd':
            showDoseDistribution = !showDoseDistribution;
            document.getElementById('showDoseDistribution').checked = showDoseDistribution;
            break;
    }
});

// Funcție pentru salvarea stării simulării
function saveSimulationState() {
    const state = {
        treatmentTechnique,
        currentAngle,
        accumulatedDose,
        fractionNumber,
        isSimulating,
        isBeamOn,
        showDoseDistribution,
        beamEnergy,
        beamWidth,
        tumorShape
    };
    localStorage.setItem('radiotherapySimulationState', JSON.stringify(state));
    console.log('Starea simulării a fost salvată');
}

// Funcție pentru încărcarea stării simulării
function loadSimulationState() {
    const savedState = localStorage.getItem('radiotherapySimulationState');
    if (savedState) {
        const state = JSON.parse(savedState);
        treatmentTechnique = state.treatmentTechnique;
        currentAngle = state.currentAngle;
        accumulatedDose = state.accumulatedDose;
        fractionNumber = state.fractionNumber;
        isSimulating = state.isSimulating;
        isBeamOn = state.isBeamOn;
        showDoseDistribution = state.showDoseDistribution;
        beamEnergy = state.beamEnergy;
        beamWidth = state.beamWidth;
        tumorShape = state.tumorShape;

        updateUIState();
        updateInfo();
        drawAnatomy();
        console.log('Starea simulării a fost încărcată');
    } else {
        console.log('Nu s-a găsit nicio stare salvată a simulării');
    }
}

// Adăugarea butoanelor pentru salvare și încărcare în interfață
const saveButton = document.createElement('button');
saveButton.textContent = 'Salvează Starea';
saveButton.addEventListener('click', saveSimulationState);
document.body.appendChild(saveButton);

const loadButton = document.createElement('button');
loadButton.textContent = 'Încarcă Starea';
loadButton.addEventListener('click', loadSimulationState);
document.body.appendChild(loadButton); 
