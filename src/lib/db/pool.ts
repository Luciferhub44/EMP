import { Pool } from 'pg'
import { config } from '../db'

export const pool = new Pool(config) 