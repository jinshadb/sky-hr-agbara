export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approved_attendance: {
        Row: {
          approved_at: string
          approved_by: string | null
          department_id: string | null
          employee_id: string
          headcount_id: string | null
          hours_worked: number | null
          id: string
          locked: boolean
          ot_hours: number
          shift_id: string | null
          status: Database["public"]["Enums"]["approved_status"]
          work_date: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          department_id?: string | null
          employee_id: string
          headcount_id?: string | null
          hours_worked?: number | null
          id?: string
          locked?: boolean
          ot_hours?: number
          shift_id?: string | null
          status: Database["public"]["Enums"]["approved_status"]
          work_date: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          department_id?: string | null
          employee_id?: string
          headcount_id?: string | null
          hours_worked?: number | null
          id?: string
          locked?: boolean
          ot_hours?: number
          shift_id?: string | null
          status?: Database["public"]["Enums"]["approved_status"]
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_attendance_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_attendance_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_attendance_headcount_id_fkey"
            columns: ["headcount_id"]
            isOneToOne: false
            referencedRelation: "daily_headcount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_records: {
        Row: {
          biometric_id_raw: string
          created_at: string
          employee_id: string | null
          exception_flags: Json
          first_in: string | null
          hours_worked: number | null
          id: string
          is_duplicate: boolean
          is_unknown: boolean
          last_out: string | null
          name_raw: string | null
          upload_id: string
          work_date: string
        }
        Insert: {
          biometric_id_raw: string
          created_at?: string
          employee_id?: string | null
          exception_flags?: Json
          first_in?: string | null
          hours_worked?: number | null
          id?: string
          is_duplicate?: boolean
          is_unknown?: boolean
          last_out?: string | null
          name_raw?: string | null
          upload_id: string
          work_date: string
        }
        Update: {
          biometric_id_raw?: string
          created_at?: string
          employee_id?: string | null
          exception_flags?: Json
          first_in?: string | null
          hours_worked?: number | null
          id?: string
          is_duplicate?: boolean
          is_unknown?: boolean
          last_out?: string | null
          name_raw?: string | null
          upload_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "biometric_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_uploads: {
        Row: {
          duplicate_rows: number
          file_name: string
          id: string
          matched_rows: number
          status: Database["public"]["Enums"]["upload_status"]
          total_rows: number
          unmatched_rows: number
          upload_date: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          duplicate_rows?: number
          file_name: string
          id?: string
          matched_rows?: number
          status?: Database["public"]["Enums"]["upload_status"]
          total_rows?: number
          unmatched_rows?: number
          upload_date?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          duplicate_rows?: number
          file_name?: string
          id?: string
          matched_rows?: number
          status?: Database["public"]["Enums"]["upload_status"]
          total_rows?: number
          unmatched_rows?: number
          upload_date?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biometric_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canteen_tickets: {
        Row: {
          approved_at: string
          approved_by: string | null
          authorized_headcount: number
          created_at: string
          department_id: string | null
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          qr_code_data: string
          shift_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          work_date: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          authorized_headcount?: number
          created_at?: string
          department_id?: string | null
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          qr_code_data: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          work_date: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          authorized_headcount?: number
          created_at?: string
          department_id?: string | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          qr_code_data?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "canteen_tickets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canteen_tickets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canteen_tickets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_attendance: {
        Row: {
          biometric_status: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          department_id: string | null
          employee_id: string
          hours_worked: number | null
          id: string
          shift_id: string | null
          source_upload_id: string | null
          work_date: string
        }
        Insert: {
          biometric_status: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          department_id?: string | null
          employee_id: string
          hours_worked?: number | null
          id?: string
          shift_id?: string | null
          source_upload_id?: string | null
          work_date: string
        }
        Update: {
          biometric_status?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          department_id?: string | null
          employee_id?: string
          hours_worked?: number | null
          id?: string
          shift_id?: string | null
          source_upload_id?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_attendance_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_source_upload_id_fkey"
            columns: ["source_upload_id"]
            isOneToOne: false
            referencedRelation: "biometric_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_headcount: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          biometric_headcount: number
          created_at: string
          department_id: string
          difference: number | null
          id: string
          reason: string | null
          shift_id: string
          status: Database["public"]["Enums"]["headcount_status"]
          verified_at: string | null
          verified_by: string | null
          verified_headcount: number | null
          work_date: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          biometric_headcount?: number
          created_at?: string
          department_id: string
          difference?: number | null
          id?: string
          reason?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["headcount_status"]
          verified_at?: string | null
          verified_by?: string | null
          verified_headcount?: number | null
          work_date: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          biometric_headcount?: number
          created_at?: string
          department_id?: string
          difference?: number | null
          id?: string
          reason?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["headcount_status"]
          verified_at?: string | null
          verified_by?: string | null
          verified_headcount?: number | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_headcount_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_headcount_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_headcount_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_headcount_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          biometric_id: string | null
          canteen_eligible: boolean
          created_at: string
          department_id: string | null
          designation: string | null
          employee_id: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          name: string
          payroll_id: string | null
          section: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }
        Insert: {
          biometric_id?: string | null
          canteen_eligible?: boolean
          created_at?: string
          department_id?: string | null
          designation?: string | null
          employee_id: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          name: string
          payroll_id?: string | null
          section?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Update: {
          biometric_id?: string | null
          canteen_eligible?: boolean
          created_at?: string
          department_id?: string | null
          designation?: string | null
          employee_id?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          name?: string
          payroll_id?: string | null
          section?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      headcount_corrections: {
        Row: {
          correction_type: Database["public"]["Enums"]["correction_type"]
          created_at: string
          created_by: string | null
          employee_id: string
          headcount_id: string
          id: string
          reason: string
        }
        Insert: {
          correction_type: Database["public"]["Enums"]["correction_type"]
          created_at?: string
          created_by?: string | null
          employee_id: string
          headcount_id: string
          id?: string
          reason: string
        }
        Update: {
          correction_type?: Database["public"]["Enums"]["correction_type"]
          created_at?: string
          created_by?: string | null
          employee_id?: string
          headcount_id?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "headcount_corrections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "headcount_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "headcount_corrections_headcount_id_fkey"
            columns: ["headcount_id"]
            isOneToOne: false
            referencedRelation: "daily_headcount"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          date_from: string
          date_to: string
          employee_id: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          status: Database["public"]["Enums"]["leave_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date_from: string
          date_to: string
          employee_id: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          employee_id?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
        }
        Relationships: [
          {
            foreignKeyName: "leave_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_records: {
        Row: {
          employee_id: string
          id: string
          method: Database["public"]["Enums"]["serve_method"]
          served_at: string
          served_by: string | null
          ticket_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          method: Database["public"]["Enums"]["serve_method"]
          served_at?: string
          served_by?: string | null
          ticket_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          method?: Database["public"]["Enums"]["serve_method"]
          served_at?: string
          served_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_records_served_by_fkey"
            columns: ["served_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_records_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "canteen_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_records_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "daily_reconciliation"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      payroll_attendance_summary: {
        Row: {
          absent_days: number
          deduction_days: number
          employee_id: string
          half_days: number
          id: string
          leave_paid_days: number
          leave_unpaid_days: number
          ot_hours: number
          paid_days: number
          payroll_period_id: string
          present_days: number
          unpaid_days: number
        }
        Insert: {
          absent_days?: number
          deduction_days?: number
          employee_id: string
          half_days?: number
          id?: string
          leave_paid_days?: number
          leave_unpaid_days?: number
          ot_hours?: number
          paid_days?: number
          payroll_period_id: string
          present_days?: number
          unpaid_days?: number
        }
        Update: {
          absent_days?: number
          deduction_days?: number
          employee_id?: string
          half_days?: number
          id?: string
          leave_paid_days?: number
          leave_unpaid_days?: number
          ot_hours?: number
          paid_days?: number
          payroll_period_id?: string
          present_days?: number
          unpaid_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_attendance_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_attendance_summary_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          generated_at: string | null
          generated_by: string | null
          id: string
          period_month: number
          period_year: number
          status: Database["public"]["Enums"]["payroll_period_status"]
        }
        Insert: {
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_month: number
          period_year: number
          status?: Database["public"]["Enums"]["payroll_period_status"]
        }
        Update: {
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_month?: number
          period_year?: number
          status?: Database["public"]["Enums"]["payroll_period_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          department_id: string | null
          employee_id: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          employee_id?: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          employee_id?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          id: string
          name: string
          start_time: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          id?: string
          name: string
          start_time: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          start_time?: string
        }
        Relationships: []
      }
      ticket_eligible_employees: {
        Row: {
          employee_id: string
          ticket_id: string
        }
        Insert: {
          employee_id: string
          ticket_id: string
        }
        Update: {
          employee_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_eligible_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_eligible_employees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "canteen_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_eligible_employees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "daily_reconciliation"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
    }
    Views: {
      daily_reconciliation: {
        Row: {
          authorized: number | null
          balance: number | null
          department_id: string | null
          department_name: string | null
          meal_type: Database["public"]["Enums"]["meal_type"] | null
          served: number | null
          shift_id: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string | null
          ticket_number: string | null
          utilization_pct: number | null
          variance: number | null
          work_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canteen_tickets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canteen_tickets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_department: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_hr: { Args: never; Returns: boolean }
      write_audit_log: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_new: Json
          p_old: Json
          p_reason?: string
          p_record_id: string
          p_table: string
        }
        Returns: undefined
      }
    }
    Enums: {
      approved_status: "present" | "absent" | "leave" | "half_day"
      attendance_status: "present" | "absent" | "half_day"
      audit_action: "insert" | "update" | "delete" | "approve" | "reopen"
      correction_type: "add_present" | "mark_absent" | "mark_leave"
      employee_status: "active" | "inactive"
      employment_type: "company" | "contract"
      headcount_status: "pending" | "approved"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "paid" | "unpaid"
      meal_type: "breakfast" | "lunch" | "dinner" | "snacks"
      payroll_period_status: "open" | "generated" | "exported" | "locked"
      serve_method: "qr" | "manual_search"
      ticket_status: "active" | "closed" | "cancelled"
      upload_status: "processing" | "completed" | "failed"
      user_role:
        | "hr_admin"
        | "hr_officer"
        | "canteen_user"
        | "department_head"
        | "payroll_user"
        | "management"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approved_status: ["present", "absent", "leave", "half_day"],
      attendance_status: ["present", "absent", "half_day"],
      audit_action: ["insert", "update", "delete", "approve", "reopen"],
      correction_type: ["add_present", "mark_absent", "mark_leave"],
      employee_status: ["active", "inactive"],
      headcount_status: ["pending", "approved"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["paid", "unpaid"],
      meal_type: ["breakfast", "lunch", "dinner", "snacks"],
      payroll_period_status: ["open", "generated", "exported", "locked"],
      serve_method: ["qr", "manual_search"],
      ticket_status: ["active", "closed", "cancelled"],
      upload_status: ["processing", "completed", "failed"],
      user_role: [
        "hr_admin",
        "hr_officer",
        "canteen_user",
        "department_head",
        "payroll_user",
        "management",
      ],
    },
  },
} as const
