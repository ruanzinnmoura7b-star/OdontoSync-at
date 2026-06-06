function dataHoraNoPassado(data, hora) {
  return new Date(`${data}T${hora}`) < new Date();
}

function validarCamposObrigatorios(obj, campos) {
  const faltando = campos.filter(c => !obj[c]);
  return faltando;
}

module.exports = { dataHoraNoPassado, validarCamposObrigatorios };
