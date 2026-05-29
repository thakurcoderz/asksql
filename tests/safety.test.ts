import { describe, expect, test } from "bun:test";
import { classifySql, enforceReadOnly, gateAction, splitStatements, stripComments } from "../src/core/safety/classifier.ts";

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

  test("CTE followed by DELETE is WRITE (not READ)", () => {
    expect(
      classifySql("WITH cte AS (SELECT id FROM users) DELETE FROM users WHERE id IN (SELECT id FROM cte)"),
    ).toBe("WRITE");
  });

  test("recursive CTE followed by UPDATE is WRITE", () => {
    expect(
      classifySql("WITH RECURSIVE cte AS (SELECT 1) UPDATE users SET active = 0"),
    ).toBe("WRITE");
  });

  test("CTE feeding INSERT is WRITE", () => {
    expect(
      classifySql("WITH cte AS (SELECT 1 AS n) INSERT INTO t (n) SELECT n FROM cte"),
    ).toBe("WRITE");
  });

  test("enforceReadOnly rejects a CTE-wrapped DELETE", () => {
    const r = enforceReadOnly("WITH cte AS (SELECT id FROM users) DELETE FROM users");
    expect(r.ok).toBe(false);
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
