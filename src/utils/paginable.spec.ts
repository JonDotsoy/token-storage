import { describe, test, expect } from "bun:test";
import { offsetPaginable } from "./paginable";

describe("offsetPaginable", () => {
  async function* a() {
    yield 1;
    yield 2;
    yield 3;
  }

  test("should paginate with offset and limit, returning first elements and a cursor", async () => {
    expect(await offsetPaginable(a(), { offset: 0, limit: 2 })).toEqual({
      next_cursor: "7b226f6666736574223a322c226c696d6974223a327d",
      items: [1, 2],
    });
  });

  test("should paginate using an existing cursor and return remaining elements", async () => {
    expect(
      await offsetPaginable(a(), {
        cursor: "7b226f6666736574223a322c226c696d6974223a327d",
      }),
    ).toEqual({
      next_cursor: undefined,
      items: [3],
    });
  });
});
