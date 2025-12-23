import { describe, expect, test } from "bun:test";
import { TokenStorage } from "./token-storage.js";

describe("TokenStorage", () => {
  test("should create a TokenStorage instance correctly", () => {
    new TokenStorage();
  });
});
