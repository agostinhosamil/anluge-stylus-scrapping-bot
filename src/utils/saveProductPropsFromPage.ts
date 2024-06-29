import { Page } from "puppeteer";

import { saveProductProps } from ".";
import { Product, ProductProps } from "../types";

type TableRowData = {
  prop: string;
  value: string;
};

export const saveProductPropsFromPage = async (
  product: Product,
  page: Page
): Promise<void> => {
  const productProps: ProductProps | null = await page.evaluate(() => {
    const productPropsTable = document.querySelector<HTMLTableElement>(
      "#newDataHook table.table-data-sheet"
    );

    if (!productPropsTable) {
      return null;
    }

    const productPropsTableRows = Array.from(productPropsTable.rows);

    const isHeadingRow = (tableRow: HTMLTableRowElement): boolean => {
      return Boolean(
        tableRow.querySelector("th") || tableRow.querySelector("thead")
      );
    };

    const sanitizeHTMLInnerText = (text: string) => {
      return text.trim().replaceAll(/\s+/g, " ");
    };

    const getRowHeadTitle = (tableRow: HTMLTableRowElement): string => {
      return sanitizeHTMLInnerText(tableRow.innerText);
    };

    const getTableRowData = (tableRow: HTMLTableRowElement): TableRowData => {
      const tableRowData = Array.from(
        tableRow.querySelectorAll<HTMLTableColElement>("td")
      ).map((element) => sanitizeHTMLInnerText(element.innerText));

      const [prop, value] = tableRowData;

      return {
        prop,
        value,
      };
    };

    let currentRowKey: string | null = null;
    let currentRowProps: ProductProps = {};

    const productProps: ProductProps = {};

    for (let i = 0; i < productPropsTableRows.length; i++) {
      const productPropsTableRow = productPropsTableRows[i];

      if (isHeadingRow(productPropsTableRow)) {
        if (currentRowKey) {
          productProps[currentRowKey] = currentRowProps;
        }

        currentRowProps = {};
        currentRowKey = getRowHeadTitle(productPropsTableRow);

        continue;
      }

      const productPropsTableRowData = getTableRowData(productPropsTableRow);

      currentRowProps[productPropsTableRowData.prop] =
        productPropsTableRowData.value;

      if (i >= productPropsTableRows.length - 1 && currentRowKey) {
        productProps[currentRowKey] = currentRowProps;
      }
    }

    return productProps;
  });

  if (productProps) {
    product.props = productProps;

    saveProductProps(product, productProps);
  }
};
