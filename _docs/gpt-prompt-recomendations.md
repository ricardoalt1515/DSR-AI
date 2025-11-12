Getting the Most Out of GPT-5 in the API and Coding Tools
While powerful, prompting with GPT-5 differs from working with other models. Below are best practices to help you achieve optimal results.

1. Be precise and avoid conflicting information
   GPT-5 is significantly better at following instructions, but vague or contradictory prompts can cause issues—especially in files like .cursor/rules or AGENTS.md. Always keep instructions specific and consistent.
2. Use the right reasoning effort
   GPT-5 performs reasoning automatically, but you should tailor the reasoning level to the task:
   High effort → complex, multi-step problems.
   Medium/Low effort → simpler tasks to prevent overthinking.
   If the model seems to “over-engineer” an answer, lower the reasoning effort or be more explicit.
3. Leverage XML-like syntax for structured instructions
   GPT-5 responds well to structured input. Using XML-style blocks can make instructions clearer. For example:
   <code_editing_rules>
   <guiding_principles> - Every component should be modular and reusable
   - …  
      </guiding_principles>
     <frontend_stack_defaults> - Styling: TailwindCSS  
      </frontend_stack_defaults>
     </code_editing_rules>
     This approach helps the model organize context more effectively.
4. Avoid overly firm language
   Previous models often benefited from strict instructions (e.g., “Be THOROUGH” or “Ensure FULL coverage”). With GPT-5, however, this can backfire: it may overdo simple tasks or make excessive tool calls. Prefer balanced, guiding language instead.
5. Allow space for planning and self-reflection
   When building zero-to-one applications, prompt the model to self-reflect before execution. This improves solution quality and helps it iterate toward stronger outputs.
   Example:
   <self_reflection>

- First, create a rubric until confident.
- Then, evaluate every aspect of what makes a world-class one-shot web app.
- Use the rubric internally (not shown to the user) to refine the solution.
- If the response doesn’t meet all rubric criteria, start again.  
  </self_reflection>

6. Control the eagerness of your coding agent
   By default, GPT-5 tries to be comprehensive when gathering context. You can regulate this with prompts by specifying:
   A tool budget (how many tools it can call).
   When to be more/less thorough.
   When to check in with the user.
   Example:
   <persistence>

- Do not ask the user to confirm or clarify assumptions.
- Make the most reasonable assumption, proceed, and document it afterward.  
  </persistence>
