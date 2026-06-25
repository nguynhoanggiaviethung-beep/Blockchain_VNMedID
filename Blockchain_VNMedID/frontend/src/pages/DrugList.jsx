import { AutoComplete, Input } from "antd";
import { useEffect, useState } from "react";

const DrugList = ({ index, drug, updateDrug }) => {
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!keyword.trim()) {
      setOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(
        `http://localhost:5000/api/v1/gov/gov-data?keyword=${encodeURIComponent(keyword)}`,
      );

      const data = await res.json();

      setOptions(
        data.data.items.map((item, index) => ({
          value: `${item.tenThuoc}-${index}`,
          label: `💊 ${item.tenThuoc}`,
          price: item.giaBanBuonDuKien,
        })),
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  console.log("OPTONS", options);

  return (
    <AutoComplete
      style={{ width: "100%" }}
      value={drug.name}
      options={options}
      onSearch={(value) => {
        setKeyword(value);
        updateDrug(index, "name", value);
      }}
      onSelect={(value, option) => {
        updateDrug(index, "name", option.value); 
        updateDrug(index, "price", option.price);

        setOptions([]);
      }}
      placeholder="Nhập tên thuốc để tra cứu gợi ý..."
    >
      <Input />
    </AutoComplete>
  );
};

export default DrugList;
