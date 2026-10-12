import "reflect-metadata";

const NUMBER_WIDTH = Symbol("chilibase:numberWidth");

/**
 * Digit count for an integer column. TypeORM 1 no longer stores MySQL display width on columns.
 * Number inputs read this value as the field width (default 11 when it is missing).
 */
export function NumberWidth(width: number): PropertyDecorator {
    return (target: object, propertyKey: string | symbol) => {
        Reflect.defineMetadata(NUMBER_WIDTH, width, target, propertyKey);
    };
}

export function getNumberWidth(target: Function, propertyName: string): number | undefined {
    const width: unknown = Reflect.getMetadata(NUMBER_WIDTH, target.prototype, propertyName);
    return typeof width === "number" ? width : undefined;
}
