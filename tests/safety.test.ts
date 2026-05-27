import { describe, expect, test } from "bun:test";
import { classifySql, gateAction, splitStatements, stripComments } from "../src/core/safety/classifier.ts";

describe("SQL classifier", () => {
  test("SELECT INTO OUTFILE is WRITE", () => {
    expect(classifySql("SELECT * FROM t INTO OUTFILE '/tmp/x'")).toBe("WRITE");
  });

  test("comment-hidden DROP is DDL", () => {
    expect(classifySql("/* c */ DROP TABLE x")).toBe("DDL");
  });

  test("multi statement is MULTI", () => {
    expect(classifySql("SELECT 1; DROP TABLE x;")).toBe("MULTI");
  });

  test("CTE SELECT is READ", () => {
    expect(classifySql("WITH cte AS (SELECT 1) SELECT * FROM cte")).toBe("READ");
  });

  test("SHOW TABLES is READ", () => {
    expect(classifySql("SHOW TABLES")).toBe("READ");
  });

  test("EXPLAIN SELECT is READ", () => {
    expect(classifySql("EXPLAIN SELECT * FROM users")).toBe("READ");
  });

  test("bare semicolon is EMPTY", () => {
    expect(classifySql(";")).toBe("EMPTY");
  });

  test("MULTI always denied", () => {
    expect(gateAction("yolo", "MULTI")).toBe("DENY");
  });

  test("safe mode denies WRITE", () => {
    expect(gateAction("safe", "WRITE")).toBe("DENY");
  });

  test("confirm mode confirms WRITE", () => {
    expect(gateAction("confirm", "WRITE")).toBe("CONFIRM");
  });
});

describe("stripComments", () => {
  test("removes line comments", () => {
    expect(stripComments("SELECT 1 -- comment")).toBe("SELECT 1 ");
  });

  test("removes block comments", () => {
    expect(stripComments("SELECT /* hidden */ 1")).toBe("SELECT  1");
  });
});

describe("splitStatements", () => {
  test("splits on semicolon", () => {
    expect(splitStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });
});
