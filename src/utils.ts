import { basename } from "node:path";
import { axios } from "./services/axios";

type Product = {
  id: string;
  code: string;
  name: string;
};

type Products = Array<Product>;

export const getProducts = async (): Promise<Products> => {
  const products: Array<Product> = [];

  const concurrency = 100;
  let cursor = 0;

  while (true) {
    try {
      const response = await axios.get<Products>(
        `/store/products?limit=${[cursor, concurrency].join(",")}`
      );

      if (!(response.data instanceof Array && response.data.length >= 1)) {
        break;
      }

      products.push(...response.data);

      cursor += concurrency;
    } catch (err) {
      console.log("[Services.Axios] Error: ", err);
    }
  }

  return products;
};

export const convertBlobToFile = (
  blobObject: Blob,
  fileName: string,
  options?: FilePropertyBag
): File => {
  return new File([blobObject], fileName, options);
};

export const getImageFileElementFromUrl = async (
  imageUrl: string
): Promise<ArrayBuffer | undefined> => {
  try {
    const response = await fetch(imageUrl);
    const imageBlobObject = await response.blob();

    const imageFileObject = convertBlobToFile(
      imageBlobObject,
      basename(imageUrl),
      {
        lastModified: Date.now(),
        type: "image/jpg",
      }
    );

    const imageFileArrayBuffer = await imageFileObject.arrayBuffer();

    return Buffer.from(imageFileArrayBuffer);
  } catch (err) {
    return;
  }
};

export const generateRandomId = (): string =>
  "10" +
  Math.random().toString().replace(/\./g, "") +
  Date.now() +
  Math.round(Date.now() * Math.random());
