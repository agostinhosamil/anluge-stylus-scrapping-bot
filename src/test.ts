import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getImageFileElementFromUrl } from "./utils";

export const testSaveFile = async () => {
  const imageFileContent = await getImageFileElementFromUrl(
    "https://www.stylus.co.ao/encomendas/themes/pf_adela/img/logos/1.png"
  );

  if (!imageFileContent) {
    return console.log("Could not save image");
  }

  // @ts-ignore
  await writeFileSync(resolve(__dirname, "file.png"), imageFileContent);

  console.log("Done");
};
