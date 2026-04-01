# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllPatients*](#listallpatients)
  - [*GetPatientMedicalRecords*](#getpatientmedicalrecords)
- [**Mutations**](#mutations)
  - [*CreateAppointment*](#createappointment)
  - [*UpdateMedicalRecord*](#updatemedicalrecord)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllPatients
You can execute the `ListAllPatients` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllPatients(options?: ExecuteQueryOptions): QueryPromise<ListAllPatientsData, undefined>;

interface ListAllPatientsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllPatientsData, undefined>;
}
export const listAllPatientsRef: ListAllPatientsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllPatients(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllPatientsData, undefined>;

interface ListAllPatientsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllPatientsData, undefined>;
}
export const listAllPatientsRef: ListAllPatientsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllPatientsRef:
```typescript
const name = listAllPatientsRef.operationName;
console.log(name);
```

### Variables
The `ListAllPatients` query has no variables.
### Return Type
Recall that executing the `ListAllPatients` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllPatientsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListAllPatients`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllPatients } from '@dataconnect/generated';


// Call the `listAllPatients()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllPatients();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllPatients(dataConnect);

console.log(data.patients);

// Or, you can use the `Promise` API.
listAllPatients().then((response) => {
  const data = response.data;
  console.log(data.patients);
});
```

### Using `ListAllPatients`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllPatientsRef } from '@dataconnect/generated';


// Call the `listAllPatientsRef()` function to get a reference to the query.
const ref = listAllPatientsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllPatientsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.patients);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.patients);
});
```

## GetPatientMedicalRecords
You can execute the `GetPatientMedicalRecords` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPatientMedicalRecords(vars: GetPatientMedicalRecordsVariables, options?: ExecuteQueryOptions): QueryPromise<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;

interface GetPatientMedicalRecordsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPatientMedicalRecordsVariables): QueryRef<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;
}
export const getPatientMedicalRecordsRef: GetPatientMedicalRecordsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPatientMedicalRecords(dc: DataConnect, vars: GetPatientMedicalRecordsVariables, options?: ExecuteQueryOptions): QueryPromise<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;

interface GetPatientMedicalRecordsRef {
  ...
  (dc: DataConnect, vars: GetPatientMedicalRecordsVariables): QueryRef<GetPatientMedicalRecordsData, GetPatientMedicalRecordsVariables>;
}
export const getPatientMedicalRecordsRef: GetPatientMedicalRecordsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPatientMedicalRecordsRef:
```typescript
const name = getPatientMedicalRecordsRef.operationName;
console.log(name);
```

### Variables
The `GetPatientMedicalRecords` query requires an argument of type `GetPatientMedicalRecordsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPatientMedicalRecordsVariables {
  patientId: UUIDString;
}
```
### Return Type
Recall that executing the `GetPatientMedicalRecords` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPatientMedicalRecordsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetPatientMedicalRecords`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPatientMedicalRecords, GetPatientMedicalRecordsVariables } from '@dataconnect/generated';

// The `GetPatientMedicalRecords` query requires an argument of type `GetPatientMedicalRecordsVariables`:
const getPatientMedicalRecordsVars: GetPatientMedicalRecordsVariables = {
  patientId: ..., 
};

// Call the `getPatientMedicalRecords()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPatientMedicalRecords(getPatientMedicalRecordsVars);
// Variables can be defined inline as well.
const { data } = await getPatientMedicalRecords({ patientId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPatientMedicalRecords(dataConnect, getPatientMedicalRecordsVars);

console.log(data.medicalRecords);

// Or, you can use the `Promise` API.
getPatientMedicalRecords(getPatientMedicalRecordsVars).then((response) => {
  const data = response.data;
  console.log(data.medicalRecords);
});
```

### Using `GetPatientMedicalRecords`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPatientMedicalRecordsRef, GetPatientMedicalRecordsVariables } from '@dataconnect/generated';

// The `GetPatientMedicalRecords` query requires an argument of type `GetPatientMedicalRecordsVariables`:
const getPatientMedicalRecordsVars: GetPatientMedicalRecordsVariables = {
  patientId: ..., 
};

// Call the `getPatientMedicalRecordsRef()` function to get a reference to the query.
const ref = getPatientMedicalRecordsRef(getPatientMedicalRecordsVars);
// Variables can be defined inline as well.
const ref = getPatientMedicalRecordsRef({ patientId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPatientMedicalRecordsRef(dataConnect, getPatientMedicalRecordsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.medicalRecords);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.medicalRecords);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAppointment
You can execute the `CreateAppointment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAppointment(vars: CreateAppointmentVariables): MutationPromise<CreateAppointmentData, CreateAppointmentVariables>;

interface CreateAppointmentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAppointmentVariables): MutationRef<CreateAppointmentData, CreateAppointmentVariables>;
}
export const createAppointmentRef: CreateAppointmentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAppointment(dc: DataConnect, vars: CreateAppointmentVariables): MutationPromise<CreateAppointmentData, CreateAppointmentVariables>;

interface CreateAppointmentRef {
  ...
  (dc: DataConnect, vars: CreateAppointmentVariables): MutationRef<CreateAppointmentData, CreateAppointmentVariables>;
}
export const createAppointmentRef: CreateAppointmentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAppointmentRef:
```typescript
const name = createAppointmentRef.operationName;
console.log(name);
```

### Variables
The `CreateAppointment` mutation requires an argument of type `CreateAppointmentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAppointmentVariables {
  patientId: UUIDString;
  medicalProfessionalId: UUIDString;
  appointmentDate: DateString;
  startTime: string;
  endTime: string;
  status: string;
  reasonForVisit: string;
}
```
### Return Type
Recall that executing the `CreateAppointment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAppointmentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAppointmentData {
  appointment_insert: Appointment_Key;
}
```
### Using `CreateAppointment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAppointment, CreateAppointmentVariables } from '@dataconnect/generated';

// The `CreateAppointment` mutation requires an argument of type `CreateAppointmentVariables`:
const createAppointmentVars: CreateAppointmentVariables = {
  patientId: ..., 
  medicalProfessionalId: ..., 
  appointmentDate: ..., 
  startTime: ..., 
  endTime: ..., 
  status: ..., 
  reasonForVisit: ..., 
};

// Call the `createAppointment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAppointment(createAppointmentVars);
// Variables can be defined inline as well.
const { data } = await createAppointment({ patientId: ..., medicalProfessionalId: ..., appointmentDate: ..., startTime: ..., endTime: ..., status: ..., reasonForVisit: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAppointment(dataConnect, createAppointmentVars);

console.log(data.appointment_insert);

// Or, you can use the `Promise` API.
createAppointment(createAppointmentVars).then((response) => {
  const data = response.data;
  console.log(data.appointment_insert);
});
```

### Using `CreateAppointment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAppointmentRef, CreateAppointmentVariables } from '@dataconnect/generated';

// The `CreateAppointment` mutation requires an argument of type `CreateAppointmentVariables`:
const createAppointmentVars: CreateAppointmentVariables = {
  patientId: ..., 
  medicalProfessionalId: ..., 
  appointmentDate: ..., 
  startTime: ..., 
  endTime: ..., 
  status: ..., 
  reasonForVisit: ..., 
};

// Call the `createAppointmentRef()` function to get a reference to the mutation.
const ref = createAppointmentRef(createAppointmentVars);
// Variables can be defined inline as well.
const ref = createAppointmentRef({ patientId: ..., medicalProfessionalId: ..., appointmentDate: ..., startTime: ..., endTime: ..., status: ..., reasonForVisit: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAppointmentRef(dataConnect, createAppointmentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.appointment_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.appointment_insert);
});
```

## UpdateMedicalRecord
You can execute the `UpdateMedicalRecord` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateMedicalRecord(vars: UpdateMedicalRecordVariables): MutationPromise<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;

interface UpdateMedicalRecordRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMedicalRecordVariables): MutationRef<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
}
export const updateMedicalRecordRef: UpdateMedicalRecordRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMedicalRecord(dc: DataConnect, vars: UpdateMedicalRecordVariables): MutationPromise<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;

interface UpdateMedicalRecordRef {
  ...
  (dc: DataConnect, vars: UpdateMedicalRecordVariables): MutationRef<UpdateMedicalRecordData, UpdateMedicalRecordVariables>;
}
export const updateMedicalRecordRef: UpdateMedicalRecordRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMedicalRecordRef:
```typescript
const name = updateMedicalRecordRef.operationName;
console.log(name);
```

### Variables
The `UpdateMedicalRecord` mutation requires an argument of type `UpdateMedicalRecordVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMedicalRecordVariables {
  id: UUIDString;
  treatment?: string | null;
  prescriptions?: string | null;
  observations?: string | null;
}
```
### Return Type
Recall that executing the `UpdateMedicalRecord` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMedicalRecordData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMedicalRecordData {
  medicalRecord_update?: MedicalRecord_Key | null;
}
```
### Using `UpdateMedicalRecord`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMedicalRecord, UpdateMedicalRecordVariables } from '@dataconnect/generated';

// The `UpdateMedicalRecord` mutation requires an argument of type `UpdateMedicalRecordVariables`:
const updateMedicalRecordVars: UpdateMedicalRecordVariables = {
  id: ..., 
  treatment: ..., // optional
  prescriptions: ..., // optional
  observations: ..., // optional
};

// Call the `updateMedicalRecord()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMedicalRecord(updateMedicalRecordVars);
// Variables can be defined inline as well.
const { data } = await updateMedicalRecord({ id: ..., treatment: ..., prescriptions: ..., observations: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMedicalRecord(dataConnect, updateMedicalRecordVars);

console.log(data.medicalRecord_update);

// Or, you can use the `Promise` API.
updateMedicalRecord(updateMedicalRecordVars).then((response) => {
  const data = response.data;
  console.log(data.medicalRecord_update);
});
```

### Using `UpdateMedicalRecord`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMedicalRecordRef, UpdateMedicalRecordVariables } from '@dataconnect/generated';

// The `UpdateMedicalRecord` mutation requires an argument of type `UpdateMedicalRecordVariables`:
const updateMedicalRecordVars: UpdateMedicalRecordVariables = {
  id: ..., 
  treatment: ..., // optional
  prescriptions: ..., // optional
  observations: ..., // optional
};

// Call the `updateMedicalRecordRef()` function to get a reference to the mutation.
const ref = updateMedicalRecordRef(updateMedicalRecordVars);
// Variables can be defined inline as well.
const ref = updateMedicalRecordRef({ id: ..., treatment: ..., prescriptions: ..., observations: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMedicalRecordRef(dataConnect, updateMedicalRecordVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.medicalRecord_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.medicalRecord_update);
});
```

