import fs, { writeFileSync } from "fs";
import { basename, resolve } from "node:path";

import { axios } from "../services/axios";

import { Product, ProductProps, Products, ProductsProps } from "../types";

const productsCacheFilePath = resolve(
  __dirname,
  "..",
  "cache",
  "products.json"
);
const productsPropsFilePath = resolve(
  __dirname,
  "..",
  "cache",
  "products-props.json"
);
const historyCacheFilePath = resolve(__dirname, "..", "cache", "history.json");

const getProductsFromCache = async (): Promise<Products> => {
  let productsCacheObject = [];

  try {
    const productsCacheFileContent = fs.readFileSync(
      productsCacheFilePath,
      "utf8"
    );

    if (/\S/.test(productsCacheFileContent)) {
      productsCacheObject = JSON.parse(productsCacheFileContent);

      if (!(productsCacheObject instanceof Array)) {
        productsCacheObject = [productsCacheObject];
      }
    }
  } catch (err) {
    // pass
  }

  return productsCacheObject as Products;
};

export const getProductsProps = (): ProductsProps => {
  let props: ProductsProps = {};

  try {
    const productsPropsFileContent = fs.readFileSync(
      productsPropsFilePath,
      "utf8"
    );

    if (/\S/.test(productsPropsFileContent)) {
      props = JSON.parse(productsPropsFileContent);
    }
  } catch (err) {
    // pass
  }

  return props;
};

export const saveProductsProps = (productsProps: ProductsProps): void => {
  const updatedProductsProps = {
    ...getProductsProps(),
    ...productsProps,
  };

  const updatedProductsPropsStr = JSON.stringify(updatedProductsProps, null, 2);

  writeFileSync(productsPropsFilePath, updatedProductsPropsStr);
};

export const saveProductProps = (
  product: Product,
  props: ProductProps
): void => {
  saveProductsProps({
    [product.id]: { product, props },
  });
};

type HistoryState = keyof History;

type History = {
  success: Products;
  failure: Products;
};

export const getHistory = (): History => {
  try {
    const historyCacheFileData = fs.readFileSync(historyCacheFilePath, "utf8");

    const historyCacheFileDataObject = JSON.parse(historyCacheFileData);

    return historyCacheFileDataObject as History;
  } catch (err) {
    return {
      failure: [],
      success: [],
    };
  }
};

export const setHistory = (
  product: Product,
  state: HistoryState = "success"
): void => {
  const historyCacheData = getHistory();

  if (!historyCacheData[state].some(({ code }) => code === product.code)) {
    historyCacheData[state].push(product);

    fs.writeFileSync(
      historyCacheFilePath,
      JSON.stringify(historyCacheData, null, 2)
    );
  }
};

export const getProducts = async (): Promise<Products> => {
  const products: Array<Product> = await getProductsFromCache();

  if (products.length >= 1) {
    return products;
  }

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

  console.log("\n\nCaching products array...\n\n");

  fs.writeFileSync(productsCacheFilePath, JSON.stringify(products, null, 2));

  console.log("\n\nCached products array.\n\n");

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

    const uint8array = new Uint8Array(imageFileArrayBuffer);

    return Buffer.from(uint8array);
  } catch (err) {
    return;
  }
};

export const generateRandomId = (): string =>
  "10" +
  Math.random().toString().replace(/\./g, "") +
  Date.now() +
  Math.round(Date.now() * Math.random());
