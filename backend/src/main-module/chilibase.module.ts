import {DynamicModule, Module} from '@nestjs/common';
import {PersistenceController} from '../persistence/persistence.controller.js';
import {PersistenceService} from '../persistence/persistence.service.js';
import {LazyDataTableService} from '../persistence/lazy-data-table.service.js';
import {EntityMetadataService} from "../entity-metadata/entity-metadata.service.js";
import {BrowseFormMetadataService} from "../dynamic-browse/browse-form-metadata.service.js";
import {FileController} from "../services/file.controller.js";
import {FileService} from "../services/file.service.js";
import {ExportCsvService} from "../export/export-csv.service.js";
import {ExportJsonService} from "../export/export-json.service.js";
import {ExportExcelService} from "../export/export-excel.service.js";
import {AuthModule} from "../auth/auth.module.js";

@Module({})
export class ChilibaseModule {

    // used method forRoot() + DynamicModule to enable to pass the parameters from module AppModule if needed
  static forRoot(): DynamicModule {

    return {
      imports: [AuthModule.forRoot()],
      controllers: [PersistenceController, FileController],
      providers: [
          PersistenceService,
          FileService,
          LazyDataTableService,
          ExportCsvService,
          ExportExcelService,
          ExportJsonService,
          EntityMetadataService,
          BrowseFormMetadataService
      ],
        // services available in other modules (e.g. AppModule in application)
        exports: [
            PersistenceService,
            FileService,
            LazyDataTableService,
            ExportCsvService,
            ExportExcelService,
            ExportJsonService
        ],
      module: ChilibaseModule
    };
  }
}
