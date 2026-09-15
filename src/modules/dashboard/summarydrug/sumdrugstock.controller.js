const repository = require("./sumdrugstock.repository");

exports.getSummary = async (req, res) => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: "GOOGLE_SHEET_ID ยังไม่ได้ตั้งค่าใน server environment"
      });
    }

    const data = await repository.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    console.error("DASHBOARD SUMMARY ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "DASHBOARD_SUMMARY_ERROR"
    });
  }
};
