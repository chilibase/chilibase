import {Injectable} from "@nestjs/common";
import {DataSource, SelectQueryBuilder} from "typeorm";
import {BrowseMetaMap} from "../common/types.js";
import {BrowseMeta} from "../modules/administration/browse-meta.entity.js";

@Injectable()
export class BrowseFormMetadataService {

    constructor(
        private readonly dataSource: DataSource
    ) {}

    async getBrowseMetaMap(): Promise<BrowseMetaMap> {

        const repository = this.dataSource.getRepository(BrowseMeta);
        const selectQueryBuilder: SelectQueryBuilder<BrowseMeta> = repository.createQueryBuilder("browseMeta");
        selectQueryBuilder.leftJoinAndSelect("browseMeta.columnMetaList", "columnMeta");
        selectQueryBuilder.orderBy({"browseMeta.id": "ASC", "columnMeta.columnOrder": "ASC"});
        const browseMetaList: BrowseMeta[] = await selectQueryBuilder.getMany();

        const browseMetaMap: BrowseMetaMap = {};
        for (const browseMeta of browseMetaList) {
            let key = browseMeta.entity;
            if (browseMeta.browseId !== null) {
               key = key + '_' + browseMeta.browseId;
            }
            browseMetaMap[key] = browseMeta;
        }
        return browseMetaMap;
    }

    // for the future
    // getFormMetaMap(): Promise<FormMetaMap> {
    // }
}
