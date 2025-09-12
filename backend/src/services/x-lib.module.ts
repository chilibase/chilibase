import {DynamicModule, Module} from '@nestjs/common';
import {XLibController} from './x-lib.controller.js';
import {XLibService} from './x-lib.service.js';
import {XLazyDataTableService} from './x-lazy-data-table.service.js';
import {XEntityMetadataService} from "./x-entity-metadata.service.js";
import {XBrowseFormMetadataService} from "./x-browse-form-metadata.service.js";
import {XFileController} from "./x-file.controller.js";
import {XFileService} from "./x-file.service.js";
import {XExportCsvService} from "./x-export-csv.service.js";
import {XExportJsonService} from "./x-export-json.service.js";
import {XExportExcelService} from "./x-export-excel.service.js";

@Module({})
export class XLibModule {

    // pouzivame metodku forRoot() + DynamicModule aby sme mohli v pripade potreby odovzdat parametre z AppModule
  static forRoot(): DynamicModule {

    return {
      imports: [],
      controllers: [XLibController, XFileController],
      providers: [
          XLibService,
          XLazyDataTableService,
          XExportCsvService,
          XExportExcelService,
          XExportJsonService,
          XEntityMetadataService,
          XBrowseFormMetadataService,
          XFileService
      ],
        // servisy ktore su dostupne v inych moduloch
        exports: [
            XLibService,
            XFileService,
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
