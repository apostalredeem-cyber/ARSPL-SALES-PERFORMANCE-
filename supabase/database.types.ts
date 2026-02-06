export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    role: 'admin' | 'employee'
                    base_location: string | null // PostGIS types are usually strings/objects depending on client
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    role?: 'admin' | 'employee'
                    base_location?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    role?: 'admin' | 'employee'
                    base_location?: string | null
                    created_at?: string
                }
            }
            work_plans: {
                Row: {
                    id: string
                    user_id: string
                    date: string
                    tasks: string[] | null
                    planned_route: string | null
                    status: 'pending' | 'approved' | 'rejected'
                    submitted_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    date: string
                    tasks?: string[] | null
                    planned_route?: string | null
                    status?: 'pending' | 'approved' | 'rejected'
                    submitted_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    date?: string
                    tasks?: string[] | null
                    planned_route?: string | null
                    status?: 'pending' | 'approved' | 'rejected'
                    submitted_at?: string
                }
            }
            gps_logs: {
                Row: {
                    id: number
                    user_id: string
                    location: string
                    heading: number | null
                    speed: number | null
                    accuracy: number | null
                    battery_level: number | null
                    is_mocked: boolean | null
                    timestamp: string
                }
                Insert: {
                    id?: number
                    user_id: string
                    location: string
                    heading?: number | null
                    speed?: number | null
                    accuracy?: number | null
                    battery_level?: number | null
                    is_mocked?: boolean | null
                    timestamp?: string
                }
                Update: {
                    id?: number
                    user_id?: string
                    location?: string
                    heading?: number | null
                    speed?: number | null
                    accuracy?: number | null
                    battery_level?: number | null
                    is_mocked?: boolean | null
                    timestamp?: string
                }
            }
            expenses: {
                Row: {
                    id: string
                    user_id: string
                    amount: number
                    category: string | null
                    description: string | null
                    receipt_url: string | null
                    location_tagged: string | null
                    status: 'pending' | 'approved' | 'rejected' | 'paid'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    amount: number
                    category?: string | null
                    description?: string | null
                    receipt_url?: string | null
                    location_tagged?: string | null
                    status?: 'pending' | 'approved' | 'rejected' | 'paid'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    amount?: number
                    category?: string | null
                    description?: string | null
                    receipt_url?: string | null
                    location_tagged?: string | null
                    status?: 'pending' | 'approved' | 'rejected' | 'paid'
                    created_at?: string
                }
            }
            deviations: {
                Row: {
                    id: string
                    user_id: string
                    deviation_point: string | null
                    distance_from_route: number | null
                    reason: string | null
                    severity: 'low' | 'medium' | 'high' | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    deviation_point?: string | null
                    distance_from_route?: number | null
                    reason?: string | null
                    severity?: 'low' | 'medium' | 'high' | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    deviation_point?: string | null
                    distance_from_route?: number | null
                    reason?: string | null
                    severity?: 'low' | 'medium' | 'high' | null
                    created_at?: string
                }
            }
        }
    }
}
