const axios = require("axios");
const FormData = require("form-data");

const verifyCCCD = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không nhận được file ảnh"
      });
    }

    const formData = new FormData();

    formData.append(
      "image",
      req.file.buffer,
      req.file.originalname
    );

    const response = await axios.post(
      "https://api.fpt.ai/vision/idr/vnm",
      formData,
      {
        headers: {
          "api-key": process.env.FPT_API_KEY,
          ...formData.getHeaders()
        }
      }
    );

    return res.json({
      success: true,
      data: response.data
    });

  } catch (error) {

    console.error(
      "FPT ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: error.response?.data || error.message
    });
  }
};

module.exports = {
  verifyCCCD
};