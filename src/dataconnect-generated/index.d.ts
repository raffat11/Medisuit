import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Appointment_Key {
  id: UUIDString;
  __typename?: 'Appointment_Key';
}

export interface CreateAppointmentData {
  appointment_insert: Appointment_Key;
}

export interface CreateAppointmentVariables {
  patientId: UUIDString;
  medicalProfessionalId: UUIDString;
  appointmentDate: DateString;
  startTime: string;
  endTime: string;
  status: string;
  reasonForVisit: string;
}

export interface GetPatientMedicalRecordsData {
  medicalRecords: ({
    id: UUIDString;
    visitDate: DateString;
    diagnosis: string;
    treatment?: string | null;
    prescriptions?: string | null;
    observations?: string | null;
    patient: {
      firstName: string;
      lastName: string;
    };
  } & MedicalRecord_Key)[];
}

export interface GetPatientMedicalRecordsVariables {
  patientId: UUIDString;
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface ListAllPatientsData {
  patients: ({
    id: UUIDString;
    firstName: string;
    lastName: string;
    dateOfBirth: DateString;
    gender: string;
    email?: string | null;
    phoneNumber?: string | null;
    user?: {
      id: UUIDString;
      email: string;
    } & User_Key;
  } & Patient_Key)[];
}

export interface MedicalRecord_Key {
  id: UUIDString;
  __typename?: 'MedicalRecord_Key';
}

export interface Patient_Key {
  id: UUIDString;
  __typename?: 'Patient_Key';
}

export interface UpdateMedicalRecordData {
  medicalRecord_update?: MedicalRecord_Key | null;
}

export interface UpdateMedicalRecordVariables {
  id: UUIDString;
  treatment?: string | null;
  prescriptions?: string | null;
  observations?: string | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface ListAllPatientsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllPatientsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllPatientsData, undefined>;
  operationName: string;
}
export const listAllPatientsRef: ListAllPatientsRef;

export function listAllPatients(options?: ExecuteQueryOptions): QueryPromise<ListAllPatientsData, undefined>;
export function listAllPatients(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllPatientsData, undefined>;

interface GetPatientMedicalRecordsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPatientMedicalRecordsVariables): QueryRef<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPatientMedicalRecordsVariables): QueryRef<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;
  operationName: string;
}
export const getPatientMedicalRecordsRef: GetPatientMedicalRecordsRef;

export function getPatientMedicalRecords(vars: GetPatientMedicalRecordsVariables, options?: ExecuteQueryOptions): QueryPromise<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;
export function getPatientMedicalRecords(dc: DataConnect, vars: GetPatientMedicalRecordsVariables, options?: ExecuteQueryOptions): QueryPromise<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;

interface CreateAppointmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAppointmentVariables): MutationRef<CreateAppointmentData, CreateAppointmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAppointmentVariables): MutationRef<CreateAppointmentData, CreateAppointmentVariables>;
  operationName: string;
}
export const createAppointmentRef: CreateAppointmentRef;

export function createAppointment(vars: CreateAppointmentVariables): MutationPromise<CreateAppointmentData, CreateAppointmentVariables>;
export function createAppointment(dc: DataConnect, vars: CreateAppointmentVariables): MutationPromise<CreateAppointmentData, CreateAppointmentVariables>;

interface UpdateMedicalRecordRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMedicalRecordVariables): MutationRef<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMedicalRecordVariables): MutationRef<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
  operationName: string;
}
export const updateMedicalRecordRef: UpdateMedicalRecordRef;

export function updateMedicalRecord(vars: UpdateMedicalRecordVariables): MutationPromise<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
export function updateMedicalRecord(dc: DataConnect, vars: UpdateMedicalRecordVariables): MutationPromise<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;

