-- ASSERT-49: the Slack channel a project's webhook posts to, as a person named it. A webhook address
-- does not say its channel, and a person recognises the channel, not the address.
ALTER TABLE error_automation ADD COLUMN slack_channel text;
