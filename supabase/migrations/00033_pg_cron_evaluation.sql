-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_evaluation_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_status int;
  response_body text;
BEGIN
  -- Call the Edge Function to process next job
  SELECT 
    status,
    content::text
  INTO 
    response_status,
    response_body
  FROM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-evaluation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  
  -- Log the result (optional)
  RAISE NOTICE 'Evaluation processor response: % %', response_status, response_body;
END;
$$;

-- Schedule the processor to run every 30 seconds
SELECT cron.schedule(
  'process-evaluations',
  '30 seconds',
  $$SELECT public.trigger_evaluation_processor()$$
);

-- Also create a function to manually trigger processing
CREATE OR REPLACE FUNCTION public.process_next_evaluation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM public.trigger_evaluation_processor();
  RETURN jsonb_build_object('success', true, 'message', 'Triggered evaluation processor');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_next_evaluation() TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION public.process_next_evaluation() IS 'Manually trigger the evaluation processor for pending jobs';
