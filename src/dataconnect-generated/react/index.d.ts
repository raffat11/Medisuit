import { ListAllPatientsData, GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables, CreateAppointmentData, CreateAppointmentVariables, UpdateMedicalRecordData, UpdateMedicalRecordVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllPatients(options?: useDataConnectQueryOptions<ListAllPatientsData>): UseDataConnectQueryResult<ListAllPatientsData, undefined>;
export function useListAllPatients(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllPatientsData>): UseDataConnectQueryResult<ListAllPatientsData, undefined>;

export function useGetPatientMedicalRecords(vars: GetPatientMedicalRecordsVariables, options?: useDataConnectQueryOptions<GetPatientMedicalRecordsData>): UseDataConnectQueryResult<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;
export function useGetPatientMedicalRecords(dc: DataConnect, vars: GetPatientMedicalRecordsVariables, options?: useDataConnectQueryOptions<GetPatientMedicalRecordsData>): UseDataConnectQueryResult<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;

export function useCreateAppointment(options?: useDataConnectMutationOptions<CreateAppointmentData, FirebaseError, CreateAppointmentVariables>): UseDataConnectMutationResult<CreateAppointmentData, CreateAppointmentVariables>;
export function useCreateAppointment(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAppointmentData, FirebaseError, CreateAppointmentVariables>): UseDataConnectMutationResult<CreateAppointmentData, CreateAppointmentVariables>;

export function useUpdateMedicalRecord(options?: useDataConnectMutationOptions<UpdateMedicalRecordData, FirebaseError, UpdateMedicalRecordVariables>): UseDataConnectMutationResult<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
export function useUpdateMedicalRecord(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMedicalRecordData, FirebaseError, UpdateMedicalRecordVariables>): UseDataConnectMutationResult<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
