import {Injectable} from "@nestjs/common";
import {DataSource, SelectQueryBuilder} from "typeorm";
import {BrowseMetaMap} from "../common/types.js";
import {BrowseMeta} from "../modules/administration/browse-meta.entity.js";

@Injectable()
export class XBrowseFormMetadataService {

    constructor(
        private readonly dataSource: DataSource
    ) {}

    async getXBrowseMetaMap(): Promise<BrowseMetaMap> {

        const repository = this.dataSource.getRepository(BrowseMeta);
        const selectQueryBuilder: SelectQueryBuilder<BrowseMeta> = repository.createQueryBuilder("xBrowseMeta");
        selectQueryBuilder.leftJoinAndSelect("xBrowseMeta.columnMetaList", "xColumnMeta");
        selectQueryBuilder.orderBy({"xBrowseMeta.id": "ASC", "xColumnMeta.columnOrder": "ASC"});
        const xBrowseMetaList: BrowseMeta[] = await selectQueryBuilder.getMany();

        const xBrowseMetaMap: BrowseMetaMap = {};
        for (const xBrowseMeta of xBrowseMetaList) {
            let key = xBrowseMeta.entity;
            if (xBrowseMeta.browseId !== null) {
               key = key + '_' + xBrowseMeta.browseId;
            }
            xBrowseMetaMap[key] = xBrowseMeta;
        }
        return xBrowseMetaMap;
    }

    // for the future
    // getXFormMetaMap(): Promise<XFormMetaMap> {
    // }
}
