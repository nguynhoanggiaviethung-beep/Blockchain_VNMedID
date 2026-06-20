const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

// ─── LẤY DANH SÁCH GIÁ THUỐC TỪ DAV ───────────────────────────────────────────
exports.getGovData = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 15);
    const keyword = req.query.keyword;

    const jar = new CookieJar();

    const client = wrapper(
      axios.create({
        jar,
        withCredentials: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36",
        },
      })
    );

    // 1. Lấy Session + Cookie
    await client.get("https://dichvucong.dav.gov.vn/congbogiathuoc");

    // 2. Lấy XSRF Token
    const cookies = await jar.getCookies(
      "https://dichvucong.dav.gov.vn"
    );

    const xsrf = cookies.find((c) => c.key === "XSRF-TOKEN")?.value;

    if (!xsrf) {
      return res.status(500).json({
        success: false,
        message: "Không lấy được XSRF Token.",
      });
    }

    // 3. Gọi API DAV
    const { data } = await client.post(
      "https://dichvucong.dav.gov.vn/api/services/app/quanLyGiaThuoc/GetListCongBoPublicPaging",
      {
        filterAll: keyword ? keyword : undefined,
        CongBoGiaThuoc: {},
        KichHoat: true,
        skipCount: (page - 1) * pageSize,
        maxResultCount: pageSize,
        sorting: null,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrf,
          Origin: "https://dichvucong.dav.gov.vn",
          Referer: "https://dichvucong.dav.gov.vn/congbogiathuoc",
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu thành công.",
      data: {
        page,
        pageSize,
        total: data.result.totalCount,
        totalPages: Math.ceil(data.result.totalCount / pageSize),
        items: data.result.items.map(item => ({
            tenThuoc: item.tenThuoc,
            giaBanBuonDuKien: item.giaBanBuonDuKien
        })),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống.",
      error: error.message,
    });
  }
};
