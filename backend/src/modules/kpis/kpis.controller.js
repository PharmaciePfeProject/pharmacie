import { dbQuery } from "../../config/db.js";

// ============ STOCK KPIs ============

export async function getStockKPIs(req, res) {
  try {
    // Taux de disponibilité des produits
    const availabilityResult = await dbQuery(`
      SELECT 
        ROUND((COUNT(CASE WHEN QUANTITY > 0 THEN 1 END) / 
        (CASE WHEN COUNT(*)=0 THEN 1 ELSE COUNT(*) END)) * 100, 2) as availability_rate,
        COUNT(*) as total_products,
        COUNT(CASE WHEN QUANTITY > 0 THEN 1 END) as available_count
      FROM STOCK
    `);

    // Nombre de ruptures de stock
    const stockOutResult = await dbQuery(`
      SELECT COUNT(*) as stock_outs FROM STOCK WHERE QUANTITY = 0
    `);

    // Vitesse de consommation des produits (moyenne sur 30 jours)
    const consumptionResult = await dbQuery(`
      SELECT 
        ROUND(AVG(consumption), 2) as avg_consumption,
        ROUND(MAX(consumption), 2) as max_consumption,
        ROUND(MIN(consumption), 2) as min_consumption
      FROM (
        SELECT SUM(QUANTITY) as consumption
        FROM MOVEMENT
        WHERE DATEMVT >= TRUNC(SYSDATE) - 30
        AND TYPE = 'SORTIE'
        GROUP BY PRODUIT_ID
      )
    `);

    // Valeur totale du stock
    // If unit price is not available on STOCK, fall back to total units
    const totalValueResult = await dbQuery(`
      SELECT 
        NULL as total_value,
        NULL as avg_price,
        ROUND(SUM(QUANTITY), 2) as total_units
      FROM STOCK
    `);

    res.json({
      availability: availabilityResult.rows[0],
      stockOuts: stockOutResult.rows[0],
      consumption: consumptionResult.rows[0],
      totalValue: totalValueResult.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============ PRESCRIPTIONS KPIs ============

export async function getPrescriptionsKPIs(req, res) {
  try {
    // Nombre total de prescriptions
    const totalPrescriptions = await dbQuery(`
      SELECT COUNT(*) as total FROM PRESCRIPTION
    `);

    // Prescriptions par médecin
    const prescriptionsByDoctor = await dbQuery(`
      SELECT *
      FROM (
        SELECT 
          D.ID as DOCTOR_ID,
          D.NAME as DOCTOR_NAME,
          COUNT(*) as prescription_count,
          ROUND(AVG(PL.TOTAL_QT), 2) as avg_quantity
        FROM PRESCRIPTION P
        JOIN DOCTOR D ON P.DOCTOR_ID = D.ID
        LEFT JOIN PRESCRIPTION_LINE PL ON PL.PRESCRIPTION_ID = P.ID
        GROUP BY D.ID, D.NAME
        ORDER BY COUNT(*) DESC
      )
      WHERE ROWNUM <= 10
    `);

    // Médicaments les plus prescrits
    const topMedicines = await dbQuery(`
      SELECT *
      FROM (
        SELECT 
          PL.PRODUCT_ID,
          PR.LIB as LIB,
          COUNT(*) as prescription_count,
          SUM(PL.TOTAL_QT) as total_quantity
        FROM PRESCRIPTION_LINE PL
        LEFT JOIN PRODUCT PR ON PL.PRODUCT_ID = PR.ID
        GROUP BY PL.PRODUCT_ID, PR.LIB
        ORDER BY SUM(PL.TOTAL_QT) DESC
      )
      WHERE ROWNUM <= 10
    `);

    // Quantité moyenne par prescription
    const avgQuantity = await dbQuery(`
      SELECT 
        ROUND(AVG(TOTAL_QT), 2) as avg_quantity,
        ROUND(MAX(TOTAL_QT), 2) as max_quantity,
        ROUND(MIN(TOTAL_QT), 2) as min_quantity,
        COUNT(*) as total_items
      FROM PRESCRIPTION_LINE
    `);

    res.json({
      totalPrescriptions: totalPrescriptions.rows[0],
      prescriptionsByDoctor: prescriptionsByDoctor.rows,
      topMedicines: topMedicines.rows,
      avgQuantity: avgQuantity.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============ DISTRIBUTION KPIs ============

export async function getDistributionKPIs(req, res) {
  try {
    // Nombre total de distributions
    const totalDistributions = await dbQuery(`
      SELECT COUNT(*) as total FROM DISTRIBUTION
    `);

    // Produits les plus distribués
    const topProducts = await dbQuery(`
      SELECT *
      FROM (
        SELECT 
          DL.PRODUCT_ID,
          P.LIB,
          COUNT(*) as distribution_count,
          SUM(DL.DELIVERED_QT) as total_quantity
        FROM DISTRIBUTION_LINE DL
        LEFT JOIN PRODUCT P ON DL.PRODUCT_ID = P.ID
        GROUP BY DL.PRODUCT_ID, P.LIB
        ORDER BY SUM(DL.DELIVERED_QT) DESC
      )
      WHERE ROWNUM <= 10
    `);

    // Distributions par jour
    const distributionsByDay = await dbQuery(`
      SELECT *
      FROM (
        SELECT 
          TRUNC(DATE_DIST) as distribution_date,
          COUNT(*) as count
        FROM DISTRIBUTION
        WHERE DATE_DIST >= TRUNC(SYSDATE) - 30
        GROUP BY TRUNC(DATE_DIST)
        ORDER BY TRUNC(DATE_DIST) DESC
      )
      WHERE ROWNUM <= 30
    `);

    // Distributions par semaine
    const distributionsByWeek = await dbQuery(`
      SELECT 
        TO_CHAR(DATE_DIST, 'YYYY-WW') as week,
        COUNT(*) as count
      FROM DISTRIBUTION
      WHERE DATE_DIST >= TRUNC(SYSDATE) - 90
      GROUP BY TO_CHAR(DATE_DIST, 'YYYY-WW')
      ORDER BY TO_CHAR(DATE_DIST, 'YYYY-WW') DESC
    `);

    // Distributions par mois
    const distributionsByMonth = await dbQuery(`
      SELECT 
        TO_CHAR(DATE_DIST, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM DISTRIBUTION
      WHERE DATE_DIST >= TRUNC(SYSDATE) - 365
      GROUP BY TO_CHAR(DATE_DIST, 'YYYY-MM')
      ORDER BY TO_CHAR(DATE_DIST, 'YYYY-MM') DESC
    `);

    res.json({
      totalDistributions: totalDistributions.rows[0],
      topProducts: topProducts.rows,
      byDay: distributionsByDay.rows,
      byWeek: distributionsByWeek.rows,
      byMonth: distributionsByMonth.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============ BI & REPORTING KPIs ============

export async function getReportingKPIs(req, res) {
  try {
    // Consommation mensuelle
    const monthlyConsumption = await dbQuery(`
      SELECT 
        TO_CHAR(DATEMVT, 'YYYY-MM') as month,
        SUM(QUANTITY) as total_consumption
      FROM MOVEMENT
      WHERE TYPE = 'SORTIE'
      AND DATEMVT >= TRUNC(SYSDATE) - 365
      GROUP BY TO_CHAR(DATEMVT, 'YYYY-MM')
      ORDER BY TO_CHAR(DATEMVT, 'YYYY-MM') DESC
    `);

    // Évolution du stock sur 30 jours
    const stockEvolution = await dbQuery(`
      SELECT *
      FROM (
        SELECT 
          TRUNC(DATE_MOVEMENT) as movement_date,
          SUM(CASE WHEN TYPE_MVT = 'ENTREE' THEN NVL(MOVMENT_QTE,0) ELSE 0 END) as entries,
          SUM(CASE WHEN TYPE_MVT = 'SORTIE' THEN NVL(MOVMENT_QTE,0) ELSE 0 END) as exits
        FROM STOCK_MOVEMENT SM
        LEFT JOIN STOCK_MOVEMENT_LINE SML ON SML.STOCK_MOVEMENT_ID = SM.ID
        WHERE DATE_MOVEMENT >= TRUNC(SYSDATE) - 30
        GROUP BY TRUNC(DATE_MOVEMENT)
        ORDER BY TRUNC(DATE_MOVEMENT) DESC
      )
      WHERE ROWNUM <= 30
    `);

    // Analyse des mouvements (Entrées vs Sorties)
    const movementAnalysis = await dbQuery(`
      SELECT 
        TYPE,
        COUNT(*) as movement_count,
        SUM(QUANTITY) as total_quantity
      FROM MOVEMENT
      WHERE DATEMVT >= TRUNC(SYSDATE) - 90
      GROUP BY TYPE
    `);

    res.json({
      monthlyConsumption: monthlyConsumption.rows,
      stockEvolution: stockEvolution.rows,
      movementAnalysis: movementAnalysis.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============ COMBINED KPIs DASHBOARD ============

export async function getAllKPIs(req, res) {
  try {
    const [stockKPIs, prescriptionsKPIs, distributionKPIs, reportingKPIs] = await Promise.all([
      dbQuery(`
        SELECT 
          ROUND((COUNT(CASE WHEN QUANTITY > 0 THEN 1 END) / 
          (CASE WHEN COUNT(*)=0 THEN 1 ELSE COUNT(*) END)) * 100, 2) as availability_rate,
          COUNT(CASE WHEN QUANTITY = 0 THEN 1 END) as stock_outs,
          NULL as total_value,
          ROUND(SUM(QUANTITY),2) as total_units
        FROM STOCK
      `),
      dbQuery(`
        SELECT COUNT(*) as total_prescriptions FROM PRESCRIPTION
      `),
      dbQuery(`
        SELECT COUNT(*) as total_distributions FROM DISTRIBUTION
      `),
      dbQuery(`
        SELECT 
          SUM(CASE WHEN TYPE = 'ENTREE' THEN QUANTITY ELSE 0 END) as total_entries,
          SUM(CASE WHEN TYPE = 'SORTIE' THEN QUANTITY ELSE 0 END) as total_exits
        FROM MOVEMENT
        WHERE DATEMVT >= TRUNC(SYSDATE) - 90
      `),
    ]);

    res.json({
      stock: stockKPIs.rows[0],
      prescriptions: prescriptionsKPIs.rows[0],
      distributions: distributionKPIs.rows[0],
      movements: reportingKPIs.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
