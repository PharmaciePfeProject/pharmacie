export function errorHandler(err, req, res, next) {
  // log for dev (later we’ll replace with a logger like pino)
  console.error("ERROR:", err);

  // If headers already sent, delegate to default handler
  if (res.headersSent) return next(err);

  // Oracle errors (oracledb throws objects with errorNum/code)
  if (err?.errorNum) {
    // ORA-00001 (unique constraint)
    if (err.errorNum === 1) {
      return res.status(409).json({
        message: "Conflict (duplicate value)",
        code: err.code,
        errorNum: err.errorNum,
      });
    }

    // ORA-28000 (account locked)
    if (err.errorNum === 28000) {
      return res.status(503).json({
        message: "Database account locked",
        code: err.code,
        errorNum: err.errorNum,
      });
    }

    // ORA-01109 / ORA-01033 (database not open / startup or shutdown in progress)
    if (err.errorNum === 1109 || err.errorNum === 1033) {
      return res.status(503).json({
        message: "Database unavailable (instance not open)",
        code: err.code,
        errorNum: err.errorNum,
      });
    }

    return res.status(500).json({
      message: "Database error",
      code: err.code,
      errorNum: err.errorNum,
    });
  }

  // Zod validation errors (just in case)
  if (err?.name === "ZodError") {
    return res.status(400).json({ message: "Validation error", errors: err.errors });
  }

  if (err?.status) {
    return res.status(err.status).json({
      message: err.message || "Request error",
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  return res.status(500).json({
    message: err?.message || "Internal server error",
  });
}
