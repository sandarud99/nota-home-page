module.exports = {
  async up(knex) {
    const table = 'components_shared_form_copy';
    if (!(await knex.schema.hasTable(table))) return;

    // Update the previous default in both drafts and published component entries.
    await knex(table)
      .where('success_message', 'Your inquiry was received. Thank you for your interest.')
      .update('success_message', 'All set. We’ll keep you posted');
  },
};
