const REQUIRED_ENV_KEYS = ["ORACLE_USER", "ORACLE_PASSWORD", "ORACLE_CONNECT_STRING", "JWT_SECRET"];

export function validateRequiredEnv() {
	const missing = REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] || "").trim());

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}

	const jwtSecret = String(process.env.JWT_SECRET || "").trim();
	if (jwtSecret.length < 16) {
		throw new Error("JWT_SECRET must be at least 16 characters long");
	}

	return {
		oracleUser: process.env.ORACLE_USER,
		oraclePassword: process.env.ORACLE_PASSWORD,
		oracleConnectString: process.env.ORACLE_CONNECT_STRING,
		jwtSecret,
		port: process.env.PORT || "4000",
	};
}
