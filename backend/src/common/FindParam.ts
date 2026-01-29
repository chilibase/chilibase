import {DataTableFilterMetaData, DataTableOperatorFilterMetaData, DataTableSortMeta} from "./PrimeFilterSortMeta.js";
import {Params} from "./UtilsCommon.js";

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
    fields?: string[]; // stlpce na ktorych sa vykona search, ak undefined, tak sa pouziju FindParam.fields
    value: string; // hodnoty oddelene space-om, rozdelia sa a budu vo where podmienke pouzite cez AND (ak nie je splitValue = false)
    splitValue: boolean; // ci rozdelit "value" by space (default true)
    matchMode: 'startsWith' | 'contains' | 'endsWith' | 'equals'; // zatial tieto (podmnozina z DataTableFilterMetaData), default bude 'contains'
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
    multiSortMeta?: DataTableSortMeta[]; // typ []
    entity: string;
    fields?: string[];
    aggregateItems?: SimpleAggregateItem[];
}

// TODO - idealne spravit x-query-api.ts a tam supnut vsetky Request/Response typy ktore vytvaraju joiny, where podmienky (FindParam.ts, FindResult.ts, ...)
// taky jednoduchsi FindParam
export interface LazyAutoCompleteSuggestionsRequest {
    maxRows: number;
    fullTextSearch?: FullTextSearch;
    entity: string;
    filterItems?: CustomFilterItem[];
    multiSortMeta?: DataTableSortMeta[]; // typ []
    fields?: string[];
}
