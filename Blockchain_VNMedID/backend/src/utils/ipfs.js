// File: backend/src/utils/ipfs.js
// ✅ Upload JSON lên IPFS qua Pinata — dữ liệu trở thành bất biến, có thể fetch lại qua CID

const axios = require('axios');

const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

/**
 * Upload object JSON lên IPFS qua Pinata.
 * @param {Object} jsonData - Dữ liệu cần lưu (ví dụ: bệnh án đầy đủ)
 * @param {String} name - Tên gợi nhớ cho file trên Pinata dashboard
 * @returns {Promise<String>} ipfsHash (CID) của dữ liệu vừa upload
 */
const uploadJSONToIPFS = async (jsonData, name = 'vnmedid-record') => {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error('Thiếu PINATA_JWT trong .env! Vui lòng cấu hình trước khi dùng IPFS.');
  }

  try {
    const response = await axios.post(
      PINATA_JSON_URL,
      {
        pinataContent: jsonData,
        pinataMetadata: { name },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      }
    );

    // Pinata trả về { IpfsHash, PinSize, Timestamp }
    return response.data.IpfsHash;
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    throw new Error(`Lỗi upload IPFS qua Pinata: ${msg}`);
  }
};

/**
 * Lấy URL gateway để xem nội dung đã upload trên IPFS.
 * @param {String} ipfsHash
 * @returns {String} URL đầy đủ
 */
const getIPFSGatewayUrl = (ipfsHash) => `${PINATA_GATEWAY}/${ipfsHash}`;

/**
 * Fetch lại nội dung JSON đã lưu trên IPFS bằng CID.
 * @param {String} ipfsHash
 * @returns {Promise<Object>} nội dung JSON gốc
 */
const fetchFromIPFS = async (ipfsHash) => {
  const url = getIPFSGatewayUrl(ipfsHash);
  const response = await axios.get(url, { timeout: 10000 });
  return response.data;
};

module.exports = { uploadJSONToIPFS, getIPFSGatewayUrl, fetchFromIPFS };