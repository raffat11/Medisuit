const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'medisuit',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const listAllPatientsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllPatients');
}
listAllPatientsRef.operationName = 'ListAllPatients';
exports.listAllPatientsRef = listAllPatientsRef;

exports.listAllPatients = function listAllPatients(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllPatientsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getPatientMedicalRecordsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPatientMedicalRecords', inputVars);
}
getPatientMedicalRecordsRef.operationName = 'GetPatientMedicalRecords';
exports.getPatientMedicalRecordsRef = getPatientMedicalRecordsRef;

exports.getPatientMedicalRecords = function getPatientMedicalRecords(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getPatientMedicalRecordsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createAppointmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAppointment', inputVars);
}
createAppointmentRef.operationName = 'CreateAppointment';
exports.createAppointmentRef = createAppointmentRef;

exports.createAppointment = function createAppointment(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createAppointmentRef(dcInstance, inputVars));
}
;

const updateMedicalRecordRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMedicalRecord', inputVars);
}
updateMedicalRecordRef.operationName = 'UpdateMedicalRecord';
exports.updateMedicalRecordRef = updateMedicalRecordRef;

exports.updateMedicalRecord = function updateMedicalRecord(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateMedicalRecordRef(dcInstance, inputVars));
}
;
