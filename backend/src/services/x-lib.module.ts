import {DynamicModule, Module} from '@nestjs/common';
import {XLibController} from './x-lib.controller.js';
import {XLibService} from './x-lib.service.js';
import {XLazyDataTableService} from './x-lazy-data-table.service.js';
import {XEntityMetadataService} from "./x-entity-metadata.service.js";
import {XBrowseFormMetadataService} from "./x-browse-form-metadata.service.js";
import {FileController} from "./file.controller.js";
import {FileService} from "./file.service.js";
import {XExportCsvService} from "./x-export-csv.service.js";
import {XExportJsonService} from "./x-export-json.service.js";
import {XExportExcelService} from "./x-export-excel.service.js";
import {AuthModule} from "../auth/auth.module.js";

@Module({})
export class XLibModule {

    // pouzivame metodku forRoot() + DynamicModule aby sme mohli v pripade potreby odovzdat parametre z AppModule
  static forRoot(): DynamicModule {

    return {
      imports: [AuthModule.forRoot()],
      controllers: [XLibController, FileController],
      providers: [
          XLibService,
          XLazyDataTableService,
          XExportCsvService,
          XExportExcelService,
          XExportJsonService,
          XEntityMetadataService,
          XBrowseFormMetadataService,
          FileService
      ],
        // servisy ktore su dostupne v inych moduloch
        exports: [
            XLibService,
            FileService,
            XLazyDataTableService,
            XExportCsvService,
            XExportExcelService,
            XExportJsonService,
            XEntityMetadataService
        ],
      module: XLibModule
    };
  }
}
