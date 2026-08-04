const normalizeTemplateValue = (value) => {
    if (value == null) {
        return "";
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean)
            .join(",");
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return "";
};

const hasTemplateValue = (value) => {
    if (value == null) {
        return false;
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean)
            .length > 0;
    }

    if (typeof value === "string") {
        return value.trim().length > 0;
    }

    return typeof value === "number" || typeof value === "boolean";
};

const filterOptionalGeographicalCriteria = (fileContent, config = {}) => {
    const hasCountyNos = hasTemplateValue(config.trafikverketCountyNos);
    const hasLocationCoordinates = hasTemplateValue(config.trafikverketLocationCoordinates);
    const hasLocationRadius = hasTemplateValue(config.trafikverketLocationRadius);

    return fileContent
        .split(/\r?\n/)
        .filter((line) => {
            const trimmedLine = line.trim();

            if (!hasCountyNos && trimmedLine.includes('name="Deviation.CountyNo"')) {
                return false;
            }

            if ((!hasLocationCoordinates || !hasLocationRadius)
                && trimmedLine.includes('name="Deviation.Geometry.Point.SWEREF99TM"')) {
                return false;
            }

            return true;
        })
        .join("\n");
};

const applyTrafikverketRequestVariables = (fileContent, config = {}) => filterOptionalGeographicalCriteria(fileContent, config)
    .replace(
        /\{\{\s*([a-zA-Z0-9_.$-]+)\s*\}\}/g,
        (_, variableName) => normalizeTemplateValue(config[variableName])
    );

/** Expecting the following format:
 * Example:
 * POST https://api.trafikinfo.trafikverket.se/v2/data.json HTTP/1.1
 * content-type: application/xml
 *
 * <REQUEST>
 *     ...
 * </REQUEST>
 */
const parseHttpRequest = (fileContent) => {
    const lines = fileContent.split(/\r?\n/);
    const requestLineIndex = lines.findIndex((line) => line.trim() !== "");

    if (requestLineIndex === -1) {
        throw new Error("HTTP request file is empty");
    }

    const requestLine = lines[requestLineIndex].trim();
    const requestMatch = requestLine.match(/^(POST|GET|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s+HTTP\/\d\.\d$/i);

    if (!requestMatch) {
        throw new Error(`Invalid HTTP request line: ${requestLine}`);
    }

    const headers = {};
    let currentLine = requestLineIndex + 1;

    while (currentLine < lines.length && lines[currentLine].trim() !== "") {
        const headerLine = lines[currentLine];
        const separatorIndex = headerLine.indexOf(":");

        if (separatorIndex > 0) {
            const headerName = headerLine.slice(0, separatorIndex).trim();
            const headerValue = headerLine.slice(separatorIndex + 1).trim();
            headers[headerName] = headerValue;
        }

        currentLine += 1;
    }

    while (currentLine < lines.length && lines[currentLine].trim() === "") {
        currentLine += 1;
    }

    const body = lines.slice(currentLine).join("\n").trim();

    return {
        method: requestMatch[1].toUpperCase(),
        url: requestMatch[2],
        headers,
        body: body.length > 0 ? body : undefined,
    };
};

module.exports = {
    applyTrafikverketRequestVariables,
    parseHttpRequest,
};