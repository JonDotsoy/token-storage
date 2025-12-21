import { spawnSync } from "bun";

export const openUrl = async (url: string) => {
  const ui = false;
  if (ui) {
    spawnSync({ cmd: ["open", url], stdout: "inherit", stderr: "inherit" });
  }
  const auto = true;
  if (auto) {
    await fetch(url, { redirect: "follow" });
  }
};
