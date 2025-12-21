import * as Bun from "bun";
import { spawn } from "bun";

export class Service {
  #healthCheck?: string;
  #cmd?: string[];
  #childprocess?: Bun.Subprocess<"ignore", "inherit", "inherit">;

  cmd(args: string[]) {
    this.#cmd = args;
    return this;
  }

  healthCheck(url: string) {
    this.#healthCheck = url;
    return this;
  }

  async close() {
    if (!this.#childprocess) throw new Error("No child process");
    this.#childprocess.kill("SIGQUIT");
    await this.#childprocess.exited;
  }

  async start() {
    if (!this.#cmd) throw new Error("No command provided");
    this.#childprocess = await spawn({
      cmd: this.#cmd,
      stdout: "inherit",
      stderr: "inherit",
    });
    if (this.#healthCheck) {
      while (true) {
        try {
          const response = await fetch(this.#healthCheck);
          if (response.status === 200) {
            break;
          }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 90));
        }
      }
    }
  }
}
