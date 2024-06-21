import { axios } from "./services/axios";

type Product = {
  id: string;
  code: string;
};

type Products = Array<Product>;

export const getProducts = async (): Promise<Products> => {
  try {
    const response = await axios.get<Products>("/store/products");

    return response.data;
  } catch (err) {
    console.log("[Services.Axios] Error: ", err);
  }

  return [];
};
