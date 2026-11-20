
import { NextResponse } from "next/server";

export const BOM_PERMISSION = "bill_of_materials";

export const NO_STORE_HEADERS = {
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

export function bomError(error) {
    console.error("BILL OF MATERIALS API ERROR:", error);

    const status = Number(error?.status || error?.statusCode);

    return NextResponse.json(
        {
            success: false,
            message: error?.message || "An unexpected BOM error occurred.",
        },
        {
            status: status >= 400 && status < 600 ? status : 500,
            headers: NO_STORE_HEADERS,
        }
    );
}

export function validationError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

export function positiveId(value, label = "ID") {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw validationError(`${label} must be a valid positive number.`);
    }

    return id;
}

export function optionalId(value, label = "ID") {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    return positiveId(value, label);
}

export function decimal(value, label, { allowZero = true, defaultValue } = {}) {
    if (value === "" || value === null || value === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw validationError(`${label} is required.`);
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        throw validationError(`${label} must be a valid number.`);
    }

    if (allowZero ? number < 0 : number <= 0) {
        throw validationError(
            allowZero
                ? `${label} cannot be negative.`
                : `${label} must be greater than zero.`
        );
    }

    return number;
}

export function text(value, label, { required = false, max = 255 } = {}) {
    const result = String(value ?? "").trim();

    if (required && !result) {
        throw validationError(`${label} is required.`);
    }

    if (result.length > max) {
        throw validationError(`${label} cannot exceed ${max} characters.`);
    }

    return result || null;
}

export function prepareBomBody(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw validationError("Invalid request body.");
    }

    const bomName = text(body.bomName, "BOM name", {
        required: true,
        max: 255,
    });

    const assemblyType = String(body.assemblyType || "PRODUCT")
        .trim()
        .toUpperCase();

    if (!["PRODUCT", "SUB_PRODUCT"].includes(assemblyType)) {
        throw validationError("Invalid assembly item type.");
    }

    const assemblyProductId =
        assemblyType === "PRODUCT"
            ? positiveId(body.assemblyProductId, "Assembly product")
            : null;

    const assemblySubProductId =
        assemblyType === "SUB_PRODUCT"
            ? positiveId(body.assemblySubProductId, "Assembly sub-product")
            : null;

    if (!Array.isArray(body.revisions) || body.revisions.length === 0) {
        throw validationError("At least one BOM revision is required.");
    }

    if (body.revisions.length > 100) {
        throw validationError("A maximum of 100 revisions is allowed.");
    }

    const revisionNames = new Set();

    const revisions = body.revisions.map((revision, revisionIndex) => {
        const revisionName = text(
            revision.revisionName,
            `Revision name ${revisionIndex + 1}`,
            { required: true, max: 100 }
        );

        const normalizedName = revisionName.toLowerCase();

        if (revisionNames.has(normalizedName)) {
            throw validationError(`Duplicate revision name: ${revisionName}.`);
        }

        revisionNames.add(normalizedName);

        const revisionId = optionalId(
            revision.revisionId,
            `Revision ID ${revisionIndex + 1}`
        );

        const runRate = decimal(
            revision.runRate,
            `Run rate for revision ${revisionName}`,
            { defaultValue: 0 }
        );

        if (!Array.isArray(revision.components) || revision.components.length === 0) {
            throw validationError(
                `Add at least one component to revision ${revisionName}.`
            );
        }

        if (revision.components.length > 500) {
            throw validationError(
                "A maximum of 500 components is allowed per revision."
            );
        }

        const components = revision.components.map((component, componentIndex) => {
            const itemType = String(component.itemType || "PRODUCT")
                .trim()
                .toUpperCase();

            if (!["PRODUCT", "SUB_PRODUCT"].includes(itemType)) {
                throw validationError(
                    `Invalid item type on component ${componentIndex + 1}.`
                );
            }

            const productId =
                itemType === "PRODUCT"
                    ? positiveId(
                        component.productId,
                        `Product on component ${componentIndex + 1}`
                    )
                    : null;

            const subProductId =
                itemType === "SUB_PRODUCT"
                    ? positiveId(
                        component.subProductId,
                        `Sub-product on component ${componentIndex + 1}`
                    )
                    : null;

            const bomQuantity = decimal(
                component.bomQuantity,
                `BOM quantity on component ${componentIndex + 1}`,
                { allowZero: false }
            );

            const quantityType = String(component.quantityType || "QUANTITY")
                .trim()
                .toUpperCase();

            if (!["QUANTITY", "PERCENTAGE"].includes(quantityType)) {
                throw validationError("Invalid component quantity type.");
            }

            const itemSource = text(
                component.itemSource || "STOCK",
                "Item source",
                { max: 30 }
            );

            return {
                productId,
                subProductId,
                itemDescription: text(
                    component.itemDescription,
                    "Item description",
                    { max: 2000 }
                ),
                uom: text(component.uom, "Component UOM", { max: 50 }),
                bomQuantity,
                quantityType,
                itemSource: itemSource || "STOCK",
            };
        });

        const hasProcess = Boolean(revision.hasProcess);
        let process = null;

        if (hasProcess) {
            const sourceProcess = revision.process || {};

            const processId = optionalId(
                sourceProcess.processId,
                `Routing ID for revision ${revisionName}`
            );

            const processName = text(
                sourceProcess.processName,
                "Routing name",
                { required: true, max: 255 }
            );

            if (!Array.isArray(sourceProcess.steps) || sourceProcess.steps.length === 0) {
                throw validationError(
                    `Add at least one routing step to revision ${revisionName}.`
                );
            }

            const steps = sourceProcess.steps.map((step, stepIndex) => ({
                sequence: positiveId(
                    step.sequence || stepIndex + 1,
                    `Routing sequence on step ${stepIndex + 1}`
                ),
                operationName: text(
                    step.operationName,
                    `Operation name on step ${stepIndex + 1}`,
                    { required: true, max: 255 }
                ),
                workCenter: text(step.workCenter, "Work center", { max: 255 }),
                operationDescription: text(
                    step.operationDescription,
                    "Operation description",
                    { max: 2000 }
                ),
            }));

            const sequences = new Set(steps.map((step) => step.sequence));

            if (sequences.size !== steps.length) {
                throw validationError(
                    `Routing step sequence numbers must be unique in revision ${revisionName}.`
                );
            }

            process = {
                processId,
                processName,
                location: text(sourceProcess.location, "Routing location", {
                    max: 255,
                }),
                processDescription: text(
                    sourceProcess.processDescription,
                    "Item description",
                    { max: 5000 }
                ),
                processMemo: text(sourceProcess.processMemo, "Routing memo", {
                    max: 5000,
                }),
                steps: steps.sort((a, b) => a.sequence - b.sequence),
            };
        }

        return {
            revisionId,
            revisionName,
            runRate,
            hasProcess,
            components,
            process,
        };
    });

    return {
        bomName,
        assemblyType,
        assemblyProductId,
        assemblySubProductId,
        memo: text(body.memo, "Memo", { max: 5000 }),
        unitOfMeasure: text(body.unitOfMeasure, "Unit of measure", {
            max: 50,
        }),
        revisions,
    };
}
