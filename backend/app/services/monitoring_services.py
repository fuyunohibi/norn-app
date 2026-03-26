"""Shared application service instances (same supabase singleton as routers)."""

from app.services.activity_monitoring_service import ActivityMonitoringService
from app.services.alert_application_service import AlertApplicationService
from app.services.supabase_service import supabase_service

activity_monitoring_service = ActivityMonitoringService(supabase_service)
alert_application_service = AlertApplicationService(supabase_service)
