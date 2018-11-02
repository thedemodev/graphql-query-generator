import * as fs from 'fs'
import { buildSchema, print, validate, DocumentNode, OperationDefinitionNode, DefinitionNode } from 'graphql'
import { Configuration, generateRandomQuery } from '../src/index'
import { GITHUB_PROVIDERS } from './github-providers'

// globals:
const schemaDef = fs.readFileSync('./test/fixtures/schema.graphql').toString()
const schema = buildSchema(schemaDef)

const schemaDefGitHub = fs.readFileSync('./test/fixtures/github.graphql').toString()
const schemaGitHub = buildSchema(schemaDefGitHub)

const schemaDefSimple = fs.readFileSync('./test/fixtures/simple.graphql').toString()
const schemaSimple = buildSchema(schemaDefSimple)

// helper function:
function getOperationDefinition (doc: DocumentNode) : OperationDefinitionNode {
  const opDefs : DefinitionNode[] = doc.definitions.filter(def => {
    return def.kind === 'OperationDefinition'
  })
  return opDefs[0] as OperationDefinitionNode
}

test(`Obtain random query from example schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.1,
    depthProbability: 0.1
  }

  const {queryDocument, variableValues} = generateRandomQuery(schema, config)
  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  const opDef = getOperationDefinition(queryDocument)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  const errors = validate(schema, queryDocument)
  expect(errors).toEqual([])
})

test(`Obtain complete query from example schema`, () => {
  const config : Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    maxDepth: 2
  }

  const {queryDocument, variableValues} = generateRandomQuery(schema, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schema, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Avoid picking field with only nested subfields when approaching max depth`, () => {
  const config : Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    maxDepth: 3
  }

  const {queryDocument, variableValues} = generateRandomQuery(schema, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schema, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Obtain random query from GitHub schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first']
  }

  const {queryDocument, variableValues} = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  // console.log(print(queryDocument))
  // console.log(variableValues)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Provide custom provider map for GitHub schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.2,
    depthProbability: 0.3,
    maxDepth: 7,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    providerMap: GITHUB_PROVIDERS
  }

  const {queryDocument, variableValues} = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  // console.log(print(queryDocument))
  // console.log(variableValues)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Provided variables are passed to providers`, () => {
  const config : Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    providerMap: {
      '*__*__name': (providedVars) => {
        if (typeof providedVars['Query__repository__owner'] === 'string') {
          return 'Two'
        }
        return 'One'
      },
      '*__*__owner': (providedVars) => {
        if (typeof providedVars['Query__repository__name'] === 'string') {
          return 'Two'
        }
        return 'One'
      }
    }
  }

  const {queryDocument, variableValues} = generateRandomQuery(schemaSimple, config)
  const errors = validate(schemaSimple, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(errors).toEqual([])
  expect(variableValues['Query__repository__name'] != variableValues['Query__repository__owner']).toBeTruthy()
})
