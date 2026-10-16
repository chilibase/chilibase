import {Injectable} from "@nestjs/common";
import {DataSource, Repository, SelectQueryBuilder} from "typeorm";
import {FileMeta} from "./file-meta.entity.js";

@Injectable()
export class FileService {

    constructor(
        private readonly dataSource: DataSource
    ) {
    }

    async saveFileMeta(fileMeta: FileMeta): Promise<FileMeta> {
        const repository: Repository<FileMeta> = this.dataSource.getRepository(FileMeta);
        const fileMetaReloaded: FileMeta = await repository.save(fileMeta);
        delete fileMetaReloaded.data; // we do not want to return the file
        return fileMetaReloaded;
    }

    async readFileMetaByIdWithData(id: number): Promise<FileMeta> {
        const selectQueryBuilder: SelectQueryBuilder<FileMeta> = this.dataSource.createQueryBuilder(FileMeta, 'fileMeta');
        // we explicitly create the SELECT clause because the "data" column is marked as "select: false" - by default we do not select it
        selectQueryBuilder
            .select('fileMeta.id')
            .addSelect('fileMeta.name')
            .addSelect('fileMeta.size')
            .addSelect('fileMeta.pathName')
            .addSelect('fileMeta.data');
        selectQueryBuilder.whereInIds([id]);
        return await selectQueryBuilder.getOneOrFail();
    }
}
