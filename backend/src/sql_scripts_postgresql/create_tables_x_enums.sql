/*
-- DROP TABLE
DROP TABLE <schema>.x_enum_value;
DROP TABLE <schema>.x_enum_type;
DROP TABLE <schema>.x_parameter;
*/

CREATE TABLE <schema>.x_enum_type (
    id SERIAL PRIMARY KEY,
    code varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    read_only BOOLEAN NOT NULL default false, -- if true, user cannot change this record and his child x_enum_value records (except name), because records are used in source code
    modif_date TIMESTAMP,
    modif_x_user_id INT,
    version INT NOT NULL
);

CREATE TABLE <schema>.x_enum_value (
    id SERIAL PRIMARY KEY,
    code varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    enabled BOOLEAN NOT NULL default true, -- used only if needed (this field is usually not used in source code)
    read_only BOOLEAN NOT NULL default false, -- if true, user cannot change this record (except name), because record is used in source code
    enum_order INT,
    x_enum_type_id INT NOT NULL
);

CREATE TABLE <schema>.x_parameter (
    id SERIAL PRIMARY KEY,
    code varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    value varchar NOT NULL,
    modif_date TIMESTAMP,
    modif_x_user_id INT,
    version INT NOT NULL
);

-- FK constraints in PostgreSQL do not create indexes, the indexes have to be created explicitly
-- (unique constraints create indexes automatically)
-- PostgreSQL creates default constraint/index names (if the names are not specified explicitly)

-- x_enum_type
ALTER TABLE <schema>.x_enum_type ADD UNIQUE (code);
ALTER TABLE <schema>.x_enum_type ADD FOREIGN KEY (modif_x_user_id) REFERENCES <schema>.x_user (id);
CREATE INDEX ON <schema>.x_enum_type (modif_x_user_id);

-- x_enum_value
ALTER TABLE <schema>.x_enum_value ADD FOREIGN KEY (x_enum_type_id) REFERENCES <schema>.x_enum_type (id);
CREATE INDEX ON <schema>.x_enum_value (x_enum_type_id);
ALTER TABLE <schema>.x_enum_value ADD UNIQUE (x_enum_type_id, code);

-- x_param
ALTER TABLE <schema>.x_parameter ADD UNIQUE (code);
ALTER TABLE <schema>.x_parameter ADD FOREIGN KEY (modif_x_user_id) REFERENCES <schema>.x_user (id);
CREATE INDEX ON <schema>.x_parameter (modif_x_user_id);
