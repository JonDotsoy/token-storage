import * as Bun from "bun";

export class DB {
  #path?: string;

  path(path: string) {
    this.#path = path;
    return this;
  }

  clean() {
    if (!this.#path) throw new Error("No path provided");
    Bun.spawn(["rm", "-rf", this.#path]);
  }
}
