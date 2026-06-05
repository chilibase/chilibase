import {DynamicModule, Module} from '@nestjs/common';
import {PersistenceController} from '../persistence/persistence.controller.js';
import {PersistenceService} from '../persistence/persistence.service.js';
import {LazyDataTableService} from '../persistence/lazy-data-table.service.js';
import {XEntityMetadataService} from "../services/x-entity-metadata.service.js";
import {XBrowseFormMetadataService} from "../services/x-browse-form-metadata.service.js";
import {FileController} from "../services/file.controller.js";
import {FileService} from "../services/file.service.js";
import {XExportCsvService} from "../services/x-export-csv.service.js";
import {XExportJsonService} from "../services/x-export-json.service.js";
import {XExportExcelService} from "../services/x-export-excel.service.js";
import {AuthModule} from "../auth/auth.module.js";

@Module({})
export class ChilibaseModule {

    // pouzivame metodku forRoot() + DynamicModule aby sme mohli v pripade potreby odovzdat parametre z AppModule
  static forRoot(): DynamicModule {

    return {
      imports: [AuthModule.forRoot()],
      controllers: [PersistenceController, FileController],
      providers: [
          PersistenceService,
          LazyDataTableService,
          XExportCsvService,
          XExportExcelService,
          XExportJsonService,
          XEntityMetadataService,
          XBrowseFormMetadataService,
          FileService
      ],
        // servisy ktore su dostupne v inych moduloch
        exports: [
            PersistenceService,
            FileService,
            LazyDataTableService,
            XExportCsvService,
            XExportExcelService,
            XExportJsonService,
            XEntityMetadataService
        ],
      module: ChilibaseModule
    };
  }
}
