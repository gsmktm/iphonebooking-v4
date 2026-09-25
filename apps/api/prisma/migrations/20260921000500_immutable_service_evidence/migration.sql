CREATE TRIGGER "RepairQC_append_only" BEFORE UPDATE OR DELETE ON "RepairQC" FOR EACH ROW EXECUTE FUNCTION reject_device_history_mutation();
CREATE TRIGGER "RepairQCCheckItem_append_only" BEFORE UPDATE OR DELETE ON "RepairQCCheckItem" FOR EACH ROW EXECUTE FUNCTION reject_device_history_mutation();
CREATE FUNCTION protect_trade_quote_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Trade-in quotes cannot be deleted.'; END IF;
 IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
  RAISE EXCEPTION 'Create a new quote version instead of rewriting its valuation.';
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status = 'OFFERED' AND NEW.status IN ('ACCEPTED', 'REJECTED')) THEN
  RAISE EXCEPTION 'This quote decision is final.';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "TradeInQuote_snapshot_immutable" BEFORE UPDATE OR DELETE ON "TradeInQuote" FOR EACH ROW EXECUTE FUNCTION protect_trade_quote_snapshot();
