export interface AggregateValues {
    [key: string]: any;
}

export interface FindResult {
    rowList?: any[];
    totalRecords?: number;
    aggregateValues?: AggregateValues;
}
