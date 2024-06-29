export type Product = {
  id: string;
  code: string;
  name: string;
  props?: ProductProps;
};

export type Products = Array<Product>;

export type ProductProps = {
  [key: string]: string | ProductProps;
};

export type ProductsProps = {
  [id: string]: {
    props: ProductProps;
    product: Product;
  };
};
