import type {
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData,
    DataTableSortMeta
} from "primereact/datatable";
import type {Params} from "./UtilsCommon";

export enum ResultType {
    OnlyRowCount,
    OnlyPagedRows,
    RowCountAndPagedRows,
    AllRows
}

export interface CustomFilterItem {
    where: string;
    params: Params;
}

// CustomFilter is used usually in frontend, to the backend is always sent the array CustomFilterItem[], because we want it the same way like other attributes
// but it is used sometimes also in backend, for example in statistical module
export type CustomFilter = CustomFilterItem | CustomFilterItem[];

// additional match modes (extension to primereact enum FilterMatchMode)
export enum ExtendedFilterMatchMode {
    IS_NOT_NULL = 'isNotNull',
    IS_NULL = 'isNull',
    AUTO_COMPLETE = 'xAutoComplete',
    FILTER_ELEMENT = 'xFilterElement' // custom filter element (defined in filterElement property)
}

// in some special cases (e.g. match mode xAutoComplete) we use separated sql condition that is different from standard filter item (field, match mode, value)
// filter item is needed for UI, but for for DB we use sometimes another (field, match mode, value) and for easier life we use the whole sql condition created on frontend
export interface ExtendedDataTableFilterMetaData extends DataTableFilterMetaData {
    customFilterItems?: CustomFilterItem[];
}

// extended version of primereact's DataTableFilterMeta
export interface ExtendedDataTableFilterMeta {
    /**
     * Extra options.
     */
    [key: string]: ExtendedDataTableFilterMetaData | DataTableOperatorFilterMetaData;
}

export interface FullTextSearch {
    fields?: string[]; // columns on which the search is performed, if undefined, then FindParam.fields are used
    value: string; // values separated by space, they are split and will be used in the where condition via AND (if splitValue is not false)
    splitValue: boolean; // whether to split "value" by space (default true)
    matchMode: 'startsWith' | 'contains' | 'endsWith' | 'equals'; // for now these (a subset of DataTableFilterMetaData), the default will be 'contains'
}

export enum AggregateFunction {
    Min = "MIN",
    Max = "MAX",
    Sum = "SUM",
    Avg = "AVG"
}

// aggregate items used for lazy tables, for group by queries there is more complex AggregateItem
export interface SimpleAggregateItem {
    field: string;
    aggregateFunction: AggregateFunction;
}

export interface FindParam {
    resultType: ResultType;
    first?: number;
    rows?: number; // page size
    filters?: ExtendedDataTableFilterMeta;
    fullTextSearch?: FullTextSearch;
    customFilterItems?: CustomFilterItem[];
    multiSortMeta?: DataTableSortMeta[]; // type []
    entity: string;
    fields?: string[];
    aggregateItems?: SimpleAggregateItem[];
}

// TODO - ideally create x-query-api.ts and put there all Request/Response types that create joins, where conditions (FindParam.ts, FindResult.ts, ...)
// such a simpler FindParam
export interface LazyAutoCompleteSuggestionsRequest {
    maxRows: number;
    fullTextSearch?: FullTextSearch;
    entity: string;
    filterItems?: CustomFilterItem[];
    multiSortMeta?: DataTableSortMeta[]; // type []
    fields?: string[];
}
