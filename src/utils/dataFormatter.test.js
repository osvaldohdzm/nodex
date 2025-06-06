import { flattenAndFormatData, formatOutput } from './dataFormatter';

// Sample input data matching the provided structure
const sampleData = {
  Detalles: "KARIME PATRICIA BASTAR CARRANZA",
  _id: { $oid: "682247878e2f7985110cbf72" },
  status: "success",
  curp_online: {
    status: 200,
    data: {
      registros: [{
        entidad: "VERACRUZ",
        curp: "BACK900507MVZSRR09",
        nombres: "KARIME PATRICIA",
        claveEntidad: "VZ",
        datosDocProbatorio: {
          entidadRegistro: "VERACRUZ",
          numActa: "3338",
          municipioRegistro: "COATZACOALCOS",
          anioReg: "1990",
          claveMunicipioRegistro: "39",
          claveEntidadRegistro: "30"
        },
        sexo: "MUJER",
        segundoApellido: "CARRANZA",
        docProbatorio: 1,
        statusCurp: "RCN",
        nacionalidad: "MEXICO",
        primerApellido: "BASTAR",
        fechaNacimiento: "07/05/1990"
      }],
      codigo: 1,
      mensaje: "Búsqueda exitosa por curp"
    }
  },
  blacksat_fisicas: {
    status: 200,
    data: null
  },
  ine1: {
    status: 200,
    data: [{
      lugar: "30",
      paterno: "BASTAR",
      ocupacion: "ESTUDIANTE",
      colonia: "COL PETROLERA",
      materno: "CARRANZA",
      folio_nacional: "830112118972",
      sexo: "M",
      calle: "C TAMAULIPAS"
    }]
  }
};

// Process the data
const flattenedData = flattenAndFormatData(sampleData);
const formattedOutput = formatOutput(flattenedData);

// Log the results
console.log('Formatted Output:');
console.log(formattedOutput);

// Expected output should match the example in the prompt
/*
Entidad: Veracruz
Curp: BACK900507MVZSRR09
Nombres: Karime patricia
Clave Entidad: Vz
Entidad Registro: Veracruz
Num Acta: 3338
Municipio Registro: Coatzacoalcos
Anio Reg: 1990
Clave Municipio Registro: 39
Clave Entidad Registro: 30
Sexo: Mujer
Segundo Apellido: Carranza
Status Curp: Rcn
Nacionalidad: Mexico
Primer Apellido: Bastar
Fecha Nacimiento: 07/05/1990
Lugar: 30
Paterno: Bastar
Ocupacion: Estudiante
Colonia: Col petrolera
Materno: Carranza
Folio Nacional: 830112118972
Sexo: M
Calle: C tamaulipas
*/ 